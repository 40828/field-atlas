import { generatedFilesSchema } from "../types";
import { ConfigError, PermanentError, RetryableError } from "../errors";
import { CancelledError } from "../errors";
import { CODE_SYSTEM, missionBrief } from "../prompts";
import { DEFAULT_PROTOTYPE_HINT, sanitizeGeneratedFiles } from "../factory/files";
import { runSandboxChecks } from "../factory/sandbox";
import { deployGeneratedProject, verifyDeployment } from "../factory/deploy";
import { sandboxConfigured, deployConfigured } from "../config";
import { emitEvent } from "../repo/core";
import { getExperiment } from "../repo/research";
import { getProject, insertProject, updateProject } from "../repo/ops";
import { missionStillRunning } from "../repo/queue";
import type { HandlerCtx, HandlerResult } from "./types";

export async function handleFactoryBuild({ task, mission, ai, signal }: HandlerCtx): Promise<HandlerResult> {
  if (!(await missionStillRunning(mission.id))) throw new CancelledError();
  const experimentId = String(task.input.experimentId ?? "");
  const experiment = await getExperiment(mission.accountId, experimentId);
  if (!experiment?.spec) throw new PermanentError("No specification is stored for this build.");
  if (!experiment.spec.needsSoftware) {
    throw new PermanentError("The specification says this experiment should not build software.");
  }

  const generated = await ai.object({
    system: CODE_SYSTEM,
    prompt: `${missionBrief(mission)}\n\nSPEC:\n${JSON.stringify(experiment.spec)}\n\n${DEFAULT_PROTOTYPE_HINT}`,
    schema: generatedFilesSchema,
    maxOutputTokens: 8_000,
    signal,
  });

  const { map, rejected } = sanitizeGeneratedFiles(generated.files);
  if (Object.keys(map).length < 3) throw new PermanentError("Generated project was rejected: too few safe files.");

  let project = await insertProject({
    accountId: mission.accountId,
    missionId: mission.id,
    experimentId: experiment.id,
    name: experiment.spec.name,
    spec: experiment.spec,
    status: "building",
    files: map,
  });

  await emitEvent({
    accountId: mission.accountId,
    missionId: mission.id,
    taskId: task.id,
    type: "factory.code",
    status: "completed",
    title: `Generated ${Object.keys(map).length} files`,
    what: `Stored a prototype for “${experiment.spec.name}” in an isolated project record.${rejected.length ? ` Rejected ${rejected.length} unsafe paths.` : ""}`,
    why: "Files are stored in the database first. They are never executed on the application server.",
    expected: sandboxConfigured()
      ? "Run install/typecheck/test/build inside a Vercel Sandbox."
      : "Sandbox is not configured, so checks will not run.",
    evidence: Object.keys(map).slice(0, 8),
    next: sandboxConfigured() ? "Execute checks in the sandbox." : "Configure Vercel Sandbox to run isolated checks.",
  });

  if (!sandboxConfigured()) {
    await updateProject(mission.accountId, project.id, {
      status: "draft",
      error: "Sandbox is not configured. Files are stored as a draft; no checks were run.",
    });
    return {
      output: { projectId: project.id, files: Object.keys(map), sandbox: false },
      verification: {
        passed: false,
        checks: [`${Object.keys(map).length} files stored`],
        failures: ["Sandbox not configured — checks were not run. This is not a passing build."],
      },
      nextAction: "Configure Vercel Sandbox, then retry the build.",
    };
  }

  const ran = await runSandboxChecks(map, signal);
  const hardFail = ran.checks.some((c) => c.name === "install" && !c.passed);
  const status = hardFail ? "checks_failed" : ran.checks.every((c) => c.passed) ? "checks_passed" : "checks_failed";

  project = (await updateProject(mission.accountId, project.id, {
    status,
    checks: ran.checks,
    sandboxId: ran.sandboxId,
    previewUrl: ran.previewUrl,
    error: hardFail ? "Install failed inside the sandbox." : null,
  })) ?? project;

  await emitEvent({
    accountId: mission.accountId,
    missionId: mission.id,
    taskId: task.id,
    type: hardFail ? "factory.failed" : "factory.checked",
    status: hardFail ? "failed" : ran.checks.every((c) => c.passed) ? "verified" : "completed",
    title: hardFail ? "Sandbox install failed" : "Sandbox checks finished",
    what: ran.checks.map((c) => `${c.name}: ${c.passed ? "passed" : "failed"} (exit ${c.exitCode})`).join("; "),
    why: "Verification is the sandbox exit codes, not the model's opinion.",
    expected: "A reviewable prototype. Not claimed production-ready.",
    evidence: ran.checks.map((c) => `${c.name}=${c.passed}`),
    next: status === "checks_passed" ? "Preview the project. Deploy still needs a separate approval." : "Inspect failing checks in the software workspace.",
  });

  if (hardFail) throw new RetryableError("Install failed inside the sandbox.");

  return {
    output: { projectId: project.id, checks: ran.checks.map((c) => ({ name: c.name, passed: c.passed })), sandboxId: ran.sandboxId },
    verification: {
      passed: !hardFail,
      checks: ran.checks.filter((c) => c.passed).map((c) => c.name),
      failures: ran.checks.filter((c) => !c.passed).map((c) => `${c.name} exit ${c.exitCode}`),
    },
    nextAction: "Review the project. Deploy requires a separate authorised task.",
  };
}

export async function handleFactoryDeploy({ task, mission }: HandlerCtx): Promise<HandlerResult> {
  if (!(await missionStillRunning(mission.id))) throw new CancelledError();
  const projectId = String(task.input.projectId ?? "");
  const project = await getProject(mission.accountId, projectId);
  if (!project) throw new PermanentError("Project not found.");
  if (Object.keys(project.files).length === 0) throw new PermanentError("Project has no files to deploy.");
  if (!deployConfigured()) {
    throw new ConfigError("Deployment is not configured.", "Set ENGINE_VERCEL_DEPLOY_TOKEN.");
  }

  const deployed = await deployGeneratedProject(project.files, project.name);
  const verified = deployed.url ? await verifyDeployment(deployed.url) : { ok: false, status: null, error: "No URL returned" };

  await updateProject(mission.accountId, project.id, {
    status: verified.ok ? "deployed" : "failed",
    deploymentUrl: deployed.url,
    deploymentStatus: deployed.readyState,
    deploymentVerifiedAt: verified.ok ? new Date() : null,
    error: verified.ok ? null : verified.error ?? `HTTP ${verified.status}`,
  });

  await emitEvent({
    accountId: mission.accountId,
    missionId: mission.id,
    taskId: task.id,
    type: verified.ok ? "deploy.completed" : "deploy.unverified",
    status: verified.ok ? "verified" : "failed",
    title: verified.ok ? "Deployment responded" : "Deployment not verified",
    what: deployed.url
      ? `Vercel accepted deployment ${deployed.deploymentId}. GET ${deployed.url} returned ${verified.status ?? "no response"}.`
      : `Vercel accepted ${deployed.deploymentId} but returned no URL.`,
    why: "A create call is not enough — the engine fetches the URL itself.",
    expected: "A reachable public URL, or an honest failure.",
    evidence: [deployed.deploymentId, deployed.url ?? "no-url"],
    next: verified.ok ? "Record the URL on the project. You still own the Vercel account." : "Inspect the deployment in Vercel.",
  });

  return {
    output: { projectId: project.id, url: deployed.url, verified: verified.ok, deploymentId: deployed.deploymentId },
    verification: {
      passed: verified.ok,
      checks: verified.ok ? [`GET ${deployed.url} → ${verified.status}`] : [],
      failures: verified.ok ? [] : [verified.error ?? `HTTP ${verified.status}`],
    },
    nextAction: verified.ok ? "Share the URL only if you intend to." : "Fix the deployment and retry after a new approval.",
  };
}
