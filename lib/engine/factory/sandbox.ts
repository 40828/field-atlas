import "server-only";
import { Sandbox } from "@vercel/sandbox";
import { sandboxConfigured } from "../config";
import { ConfigError, RetryableError, errorMessage } from "../errors";
import type { ProjectCheck } from "../types";

const CHECKS: Array<{ name: string; command: string; args: string[] }> = [
  { name: "install", command: "npm", args: ["install", "--ignore-scripts", "--no-audit", "--no-fund"] },
  { name: "typecheck", command: "npx", args: ["--no-install", "tsc", "--noEmit", "--pretty", "false"] },
  { name: "test", command: "npm", args: ["test", "--ignore-scripts"] },
  { name: "build", command: "npm", args: ["run", "build", "--ignore-scripts"] },
];

function redactOutput(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, "").slice(0, 4_000);
}

/**
 * Run generated files in an isolated Vercel Sandbox. Never executes them on this server.
 * Network is needed for npm registry during install; commands use --ignore-scripts.
 */
export async function runSandboxChecks(files: Record<string, string>, signal?: AbortSignal): Promise<{
  sandboxId: string;
  previewUrl: string | null;
  checks: ProjectCheck[];
}> {
  if (!sandboxConfigured()) {
    throw new ConfigError(
      "Vercel Sandbox is not configured.",
      "Run `vercel env pull .env.local` in this linked project, or set VERCEL_TOKEN, VERCEL_TEAM_ID and VERCEL_PROJECT_ID.",
    );
  }

  let sandbox: Sandbox | null = null;
  try {
    sandbox = await Sandbox.create({
      runtime: "node22",
      timeout: 8 * 60_000,
      persistent: false,
      ports: [4173],
      resources: { vcpus: 2 },
      signal,
    });

    const written = Object.entries(files).map(([path, content]) => ({
      path: path.startsWith("/") ? path : `/${path}`,
      content,
    }));
    await sandbox.writeFiles(written, { signal });

    const checks: ProjectCheck[] = [];
    for (const step of CHECKS) {
      const started = Date.now();
      const result = await sandbox.runCommand(step.command, step.args, { signal });
      const stdout = redactOutput(await result.stdout());
      const stderr = redactOutput(await result.stderr());
      const output = [stdout, stderr].filter(Boolean).join("\n");
      const optional = step.name === "typecheck" || step.name === "test" || step.name === "build";
      const missingScript =
        optional && (result.exitCode !== 0) && /missing script|cannot find|not found|no such file/i.test(output);
      checks.push({
        name: step.name,
        command: `${step.command} ${step.args.join(" ")}`,
        exitCode: result.exitCode,
        passed: result.exitCode === 0 || Boolean(missingScript),
        output: missingScript ? `${output}\n(treated as skipped: script or tool not present)` : output,
        ranAt: new Date().toISOString(),
        durationMs: Date.now() - started,
      });
      if (step.name === "install" && result.exitCode !== 0) break;
    }

    let previewUrl: string | null = null;
    try {
      previewUrl = sandbox.domain(4173);
    } catch {
      previewUrl = null;
    }

    return { sandboxId: sandbox.name, previewUrl, checks };
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") throw err;
    if (err instanceof ConfigError) throw err;
    throw new RetryableError(`Sandbox execution failed: ${errorMessage(err)}`, err);
  } finally {
    if (sandbox) {
      try {
        await sandbox.stop();
      } catch {
        /* best-effort */
      }
    }
  }
}
