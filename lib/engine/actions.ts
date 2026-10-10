"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { outreachDraftSchema, missionInputSchema, PERMISSION_SCOPES, type PermissionScope } from "./types";
import { engineGuarded } from "./guarded";
import { EngineActionError } from "./session";
import { assertCanCreateMission, getEngineEntitlement } from "./entitlements";
import { enqueueExperimentPipeline, enqueueResearchPipeline } from "./pipeline";
import { OUTREACH_SYSTEM, IMPROVE_SYSTEM } from "./prompts";
import { gatewayAI } from "./ai";
import {
  audit,
  deleteMission,
  emitEvent,
  getMission,
  insertMission,
  savePermissions,
  updateMissionStatus,
} from "./repo/core";
import { addLedgerEntry, ledgerEntrySchema } from "./repo/ledger";
import {
  cancelMissionTasks,
  enqueueTask,
  listTasks,
  requeueTask,
} from "./repo/queue";
import {
  getExperiment,
  getStrategy,
  insertExperiment,
  setStrategyStatus,
  updateExperiment,
} from "./repo/research";
import {
  decideApproval,
  deleteProspect,
  getProject,
  getProspect,
  insertImprovement,
  insertOutreach,
  insertProspect,
  updateImprovement,
  updateMarketingAsset,
  updateOutreach,
  updateProject,
  updateProspect,
} from "./repo/ops";
import { insertBusiness, toggleFavorite, updateBusiness } from "./repo/catalog";
import { tickEngine } from "./worker";
import type { EngineActionResult } from "./types";

function refresh() {
  revalidatePath("/engine/app", "layout");
}

export async function createMissionAction(input: unknown): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("create-mission", { max: 10, windowMs: 60_000 }, async ({ accountId, userId }) => {
    const parsed = missionInputSchema.parse(input);
    assertCanCreateMission(await getEngineEntitlement(accountId));
    const row = await insertMission({
      accountId,
      createdBy: userId,
      objective: parsed.objective,
      targetCents: parsed.targetAmount,
      timeframeDays: parsed.timeframeDays,
      startingCapitalCents: parsed.startingCapital,
      maxSpendCents: parsed.maxSpend,
      skills: parsed.skills,
      categories: parsed.categories,
      riskTolerance: parsed.riskTolerance,
      constraints: parsed.constraints,
      zeroCapital: parsed.zeroCapital,
    });
    await audit(accountId, userId, "mission.create", row.id, { objective: row.objective });
    await emitEvent({
      accountId,
      missionId: row.id,
      type: "mission.created",
      status: "completed",
      title: "Mission created",
      what: row.title,
      why: "A persistent record holds the objective, constraints and later results.",
      expected: "You can start research when ready.",
      next: "Start the mission to enqueue the research pipeline.",
    });
    refresh();
    return { id: row.id };
  });
}

export async function startMissionAction(missionId: string): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("start-mission", { max: 20, windowMs: 60_000 }, async ({ accountId, userId }) => {
    const mission = await getMission(accountId, missionId);
    if (!mission) throw new EngineActionError("Mission not found.");
    if (mission.status === "cancelled" || mission.status === "completed") {
      throw new EngineActionError("This mission has ended.");
    }
    if (mission.status === "draft" || mission.status === "failed") {
      assertCanCreateMission(await getEngineEntitlement(accountId));
    }
    const updated = await updateMissionStatus(accountId, missionId, "running");
    if (!updated) throw new EngineActionError("Could not start the mission.");
    const existing = await listTasks(accountId, missionId);
    if (!existing.some((t) => t.kind === "research.plan")) {
      await enqueueResearchPipeline(accountId, missionId);
    }
    await audit(accountId, userId, "mission.start", missionId);
    await emitEvent({
      accountId,
      missionId,
      type: "mission.started",
      status: "in_progress",
      title: "Mission started",
      what: "Research pipeline is queued.",
      why: "Work only runs while the mission is running and a worker tick claims tasks.",
      expected: "Plan → gather sources → synthesize → rank.",
      next: "Keep this tab open or configure cron so the worker can run.",
    });
    refresh();
    return { id: missionId };
  });
}

export async function pauseMissionAction(missionId: string): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("pause-mission", { max: 30, windowMs: 60_000 }, async ({ accountId, userId }) => {
    const mission = await getMission(accountId, missionId);
    if (!mission) throw new EngineActionError("Mission not found.");
    if (mission.status !== "running" && mission.status !== "blocked") throw new EngineActionError("Only a running or blocked mission can be paused.");
    await updateMissionStatus(accountId, missionId, "paused");
    await audit(accountId, userId, "mission.pause", missionId);
    await emitEvent({
      accountId,
      missionId,
      type: "mission.paused",
      status: "completed",
      title: "Mission paused",
      what: "No new tasks will be claimed.",
      why: "You asked to stop autonomous work.",
      expected: "Queued work waits until you resume.",
      next: "Resume when you want the worker to continue.",
    });
    refresh();
    return { id: missionId };
  });
}

export async function resumeMissionAction(missionId: string): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("resume-mission", { max: 30, windowMs: 60_000 }, async ({ accountId, userId }) => {
    const mission = await getMission(accountId, missionId);
    if (!mission) throw new EngineActionError("Mission not found.");
    if (mission.status !== "paused" && mission.status !== "blocked") throw new EngineActionError("This mission is not paused.");
    await updateMissionStatus(accountId, missionId, "running");
    await audit(accountId, userId, "mission.resume", missionId);
    await emitEvent({
      accountId,
      missionId,
      type: "mission.resumed",
      status: "in_progress",
      title: "Mission resumed",
      what: "The worker may claim pending tasks again.",
      why: "You cleared the pause / blocker.",
      expected: "Queued work continues.",
      next: "Watch the activity feed.",
    });
    refresh();
    return { id: missionId };
  });
}

export async function cancelMissionAction(missionId: string): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("cancel-mission", { max: 20, windowMs: 60_000 }, async ({ accountId, userId }) => {
    const mission = await getMission(accountId, missionId);
    if (!mission) throw new EngineActionError("Mission not found.");
    await updateMissionStatus(accountId, missionId, "cancelled");
    await cancelMissionTasks(missionId);
    await audit(accountId, userId, "mission.cancel", missionId);
    await emitEvent({
      accountId,
      missionId,
      type: "mission.cancelled",
      status: "completed",
      title: "Mission cancelled",
      what: "Unfinished tasks were cancelled.",
      why: "You stopped the mission.",
      expected: "No further autonomous work on this mission.",
      next: "Review history or create a new mission.",
    });
    refresh();
    return { id: missionId };
  });
}

export async function completeMissionAction(missionId: string): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("complete-mission", { max: 10, windowMs: 60_000 }, async ({ accountId, userId }) => {
    const mission = await getMission(accountId, missionId);
    if (!mission) throw new EngineActionError("Mission not found.");
    await updateMissionStatus(accountId, missionId, "completed");
    await cancelMissionTasks(missionId);
    await audit(accountId, userId, "mission.complete", missionId);
    refresh();
    return { id: missionId };
  });
}

export async function deleteMissionAction(missionId: string): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("delete-mission", { max: 10, windowMs: 60_000 }, async ({ accountId, userId }) => {
    const mission = await getMission(accountId, missionId);
    if (!mission) throw new EngineActionError("Mission not found.");
    if (mission.status === "running") throw new EngineActionError("Pause or cancel the mission before deleting it.");
    await deleteMission(accountId, missionId);
    await audit(accountId, userId, "mission.delete", missionId);
    refresh();
    return { id: missionId };
  });
}

export async function startExperimentAction(input: {
  missionId: string;
  strategyId: string;
}): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("start-experiment", { max: 20, windowMs: 60_000 }, async ({ accountId, userId }) => {
    const mission = await getMission(accountId, input.missionId);
    if (!mission) throw new EngineActionError("Mission not found.");
    const strategy = await getStrategy(accountId, input.strategyId);
    if (!strategy) throw new EngineActionError("Strategy not found.");
    const experiment = await insertExperiment({
      accountId,
      missionId: mission.id,
      strategyId: strategy.id,
      title: strategy.rationale.slice(0, 120),
      hypothesis: `A small validation of “${strategy.kind}” will produce a measurable demand signal.`,
      successCriteria: "A real conversation, waitlist signup, or collected payment recorded in the ledger — not a model estimate.",
      plan: ["Write a specification", "Draft an offer", "Talk to a real prospect or publish a page you control"],
      status: "proposed",
    });
    await setStrategyStatus(accountId, strategy.id, "selected");
    if (mission.status !== "running") await updateMissionStatus(accountId, mission.id, "running");
    await enqueueExperimentPipeline(accountId, mission.id, experiment.id);
    await audit(accountId, userId, "experiment.start", experiment.id, { strategyId: strategy.id });
    await emitEvent({
      accountId,
      missionId: mission.id,
      type: "experiment.created",
      status: "in_progress",
      title: "Experiment queued",
      what: experiment.title,
      why: "A small experiment reduces uncertainty before a large build.",
      expected: "A specification and marketing drafts. No publish, spend, or deploy.",
      next: "The worker will write the spec when it next ticks.",
    });
    refresh();
    return { id: experiment.id };
  });
}

export async function abandonExperimentAction(id: string, lessons: string): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("abandon-experiment", { max: 20, windowMs: 60_000 }, async ({ accountId, userId }) => {
    const exp = await getExperiment(accountId, id);
    if (!exp) throw new EngineActionError("Experiment not found.");
    await updateExperiment(accountId, id, { status: "abandoned", result: lessons.slice(0, 1_000), completedAt: new Date() });
    if (exp.strategyId) await setStrategyStatus(accountId, exp.strategyId, "abandoned", lessons.slice(0, 1_000));
    await audit(accountId, userId, "experiment.abandon", id);
    refresh();
    return { id };
  });
}

export async function decideApprovalAction(id: string, decision: "approved" | "denied"): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("decide-approval", { max: 40, windowMs: 60_000 }, async ({ accountId, userId }) => {
    const row = await decideApproval(accountId, id, decision, userId);
    if (!row) throw new EngineActionError("Approval not found or already decided.");
    if (decision === "approved" && row.taskId) await requeueTask(accountId, row.taskId);
    await audit(accountId, userId, `approval.${decision}`, id, { scope: row.scope });
    refresh();
    return { id };
  });
}

export async function savePermissionsAction(input: {
  scopes: string[];
  spendLimit: number;
  zeroCapitalMode: boolean;
}): Promise<EngineActionResult<{ ok: true }>> {
  return engineGuarded("save-permissions", { max: 20, windowMs: 60_000 }, async ({ accountId, userId }) => {
    const scopes = input.scopes.filter((s): s is PermissionScope => (PERMISSION_SCOPES as readonly string[]).includes(s));
    const spendLimitCents = Math.max(0, Math.round((Number(input.spendLimit) || 0) * 100));
    await savePermissions(accountId, { scopes, spendLimitCents, zeroCapitalMode: Boolean(input.zeroCapitalMode) });
    await audit(accountId, userId, "permissions.update", accountId, { scopes, spendLimitCents });
    refresh();
    return { ok: true as const };
  });
}

export async function addLedgerEntryAction(input: unknown): Promise<EngineActionResult<{ id: string | null; duplicate: boolean }>> {
  return engineGuarded("ledger-add", { max: 30, windowMs: 60_000 }, async ({ accountId, userId }) => {
    const parsed = ledgerEntrySchema.parse(input);
    const row = await addLedgerEntry({
      accountId,
      missionId: parsed.missionId,
      kind: parsed.kind,
      amountCents: parsed.amount,
      description: parsed.description,
      source: "manual",
      sourceRef: parsed.reference,
      verification: parsed.attested ? "user_attested" : "unverified",
      occurredAt: parsed.occurredAt,
    });
    await audit(accountId, userId, "ledger.add", row?.id ?? parsed.reference, { duplicate: !row });
    refresh();
    return { id: row?.id ?? null, duplicate: !row };
  });
}

const prospectSchema = z.object({
  missionId: z.string().uuid().optional(),
  company: z.string().trim().min(1).max(160),
  contactName: z.string().trim().max(120).optional(),
  role: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  website: z.string().trim().url().max(300).optional().or(z.literal("")),
  notes: z.string().trim().max(2_000).optional(),
  stage: z.enum(["new", "qualified", "contacted", "replied", "meeting", "won", "lost"]).optional(),
  value: z.number().min(0).max(10_000_000).optional(),
});

export async function addProspectAction(input: unknown): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("prospect-add", { max: 40, windowMs: 60_000 }, async ({ accountId }) => {
    const p = prospectSchema.parse(input);
    const row = await insertProspect({
      accountId,
      missionId: p.missionId,
      company: p.company,
      contactName: p.contactName || null,
      role: p.role || null,
      email: p.email || null,
      website: p.website || null,
      notes: p.notes ?? "",
      source: "manual",
      stage: p.stage ?? "new",
      valueCents: p.value ? Math.round(p.value * 100) : 0,
    });
    refresh();
    return { id: row.id };
  });
}

export async function updateProspectAction(id: string, patch: unknown): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("prospect-update", { max: 40, windowMs: 60_000 }, async ({ accountId }) => {
    const p = prospectSchema.partial().parse(patch);
    const row = await updateProspect(accountId, id, {
      ...(p.company ? { company: p.company } : {}),
      ...(p.contactName !== undefined ? { contactName: p.contactName || null } : {}),
      ...(p.role !== undefined ? { role: p.role || null } : {}),
      ...(p.email !== undefined ? { email: p.email || null } : {}),
      ...(p.website !== undefined ? { website: p.website || null } : {}),
      ...(p.notes !== undefined ? { notes: p.notes } : {}),
      ...(p.stage ? { stage: p.stage } : {}),
      ...(p.value !== undefined ? { valueCents: Math.round(p.value * 100) } : {}),
    });
    if (!row) throw new EngineActionError("Prospect not found.");
    refresh();
    return { id };
  });
}

export async function deleteProspectAction(id: string): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("prospect-delete", { max: 20, windowMs: 60_000 }, async ({ accountId }) => {
    const ok = await deleteProspect(accountId, id);
    if (!ok) throw new EngineActionError("Prospect not found.");
    refresh();
    return { id };
  });
}

export async function draftOutreachAction(prospectId: string): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("outreach-draft", { max: 10, windowMs: 60_000 }, async ({ accountId }) => {
    const prospect = await getProspect(accountId, prospectId);
    if (!prospect) throw new EngineActionError("Prospect not found.");
    if (!gatewayAI.configured()) {
      throw new EngineActionError("No AI provider is configured. Add AI_GATEWAY_API_KEY or run `vercel env pull .env.local`.", undefined, "config");
    }
    const draft = await gatewayAI.object({
      system: OUTREACH_SYSTEM,
      prompt: `Company: ${prospect.company}\nContact: ${prospect.contactName ?? "unknown"}\nRole: ${prospect.role ?? "unknown"}\nNotes: ${prospect.notes}\nWrite one email the user will send themselves.`,
      schema: outreachDraftSchema,
    });
    const row = await insertOutreach({
      accountId,
      prospectId: prospect.id,
      subject: draft.subject,
      body: draft.body,
      status: "draft",
    });
    refresh();
    return { id: row.id };
  });
}

export async function markOutreachSentAction(id: string): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("outreach-sent", { max: 30, windowMs: 60_000 }, async ({ accountId }) => {
    const row = await updateOutreach(accountId, id, { status: "sent_manually" });
    if (!row) throw new EngineActionError("Draft not found.");
    refresh();
    return { id };
  });
}

export async function classifyOutreachAction(
  id: string,
  replyClass: "interested" | "not_now" | "not_interested" | "question" | "unsubscribe",
): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("outreach-classify", { max: 30, windowMs: 60_000 }, async ({ accountId }) => {
    const row = await updateOutreach(accountId, id, { status: "replied", replyClass });
    if (!row) throw new EngineActionError("Draft not found.");
    refresh();
    return { id };
  });
}

export async function startFactoryBuildAction(input: {
  missionId: string;
  experimentId: string;
}): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("factory-build", { max: 10, windowMs: 60_000 }, async ({ accountId, userId }) => {
    const experiment = await getExperiment(accountId, input.experimentId);
    if (!experiment?.spec) throw new EngineActionError("Write a specification before building.");
    if (!experiment.spec.needsSoftware) throw new EngineActionError("This specification is a non-software experiment.");
    const task = await enqueueTask({
      accountId,
      missionId: input.missionId,
      kind: "factory.build",
      title: `Build prototype — ${experiment.spec.name}`,
      objective: "Generate files and, if configured, run checks in an isolated sandbox.",
      requiredPermissions: ["sandbox"],
      resourceEstimate: { aiCalls: 1, costCents: 0, seconds: 180 },
      input: { experimentId: experiment.id },
      idempotencyKey: `factory.build:${experiment.id}:${Date.now()}`,
      timeoutMs: 300_000,
    });
    await audit(accountId, userId, "factory.build", task.id);
    refresh();
    return { id: task.id };
  });
}

export async function startFactoryDeployAction(input: {
  missionId: string;
  projectId: string;
}): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("factory-deploy", { max: 8, windowMs: 60_000 }, async ({ accountId, userId }) => {
    const project = await getProject(accountId, input.projectId);
    if (!project) throw new EngineActionError("Project not found.");
    const task = await enqueueTask({
      accountId,
      missionId: input.missionId,
      kind: "factory.deploy",
      title: `Deploy ${project.name}`,
      objective: "Publish only after your per-deployment approval.",
      requiredPermissions: ["deploy"],
      resourceEstimate: { aiCalls: 0, costCents: 0, seconds: 60 },
      input: { projectId: project.id },
      idempotencyKey: `factory.deploy:${project.id}:${Date.now()}`,
    });
    await audit(accountId, userId, "factory.deploy", task.id);
    refresh();
    return { id: task.id };
  });
}

export async function publishProjectAction(projectId: string, listed: boolean): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("catalog-publish", { max: 20, windowMs: 60_000 }, async ({ accountId, userId }) => {
    const row = await updateProject(accountId, projectId, { listedInCatalog: listed });
    if (!row) throw new EngineActionError("Project not found.");
    await audit(accountId, userId, listed ? "catalog.publish" : "catalog.unpublish", projectId);
    refresh();
    return { id: projectId };
  });
}

export async function toggleFavoriteAction(projectId: string): Promise<EngineActionResult<{ favorited: boolean }>> {
  return engineGuarded("catalog-favorite", { max: 40, windowMs: 60_000 }, async ({ accountId }) => {
    const result = await toggleFavorite(accountId, projectId);
    refresh();
    return result;
  });
}

const improvementSchema = z.object({
  projectId: z.string().uuid().optional(),
  observation: z.string().trim().min(10).max(600),
  hypothesis: z.string().trim().min(10).max(600),
  successCriterion: z.string().trim().min(10).max(400),
  proposal: z.string().trim().min(10).max(800),
});

export async function addImprovementAction(input: unknown): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("improve-add", { max: 20, windowMs: 60_000 }, async ({ accountId }) => {
    const p = improvementSchema.parse(input);
    const row = await insertImprovement({
      accountId,
      projectId: p.projectId,
      observation: p.observation,
      hypothesis: p.hypothesis,
      successCriterion: p.successCriterion,
      proposal: p.proposal,
    });
    refresh();
    return { id: row.id };
  });
}

export async function decideImprovementAction(
  id: string,
  status: "approved" | "rejected" | "adopted" | "rolled_back" | "tested",
  result?: string,
): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("improve-decide", { max: 20, windowMs: 60_000 }, async ({ accountId, userId }) => {
    const row = await updateImprovement(accountId, id, { status, result: result ?? null });
    if (!row) throw new EngineActionError("Improvement not found.");
    await audit(accountId, userId, `improve.${status}`, id);
    refresh();
    return { id };
  });
}

export async function generateImprovementAction(observation: string): Promise<EngineActionResult<{ draft: z.infer<typeof improvementSchema> }>> {
  return engineGuarded("improve-generate", { max: 8, windowMs: 60_000 }, async () => {
    if (!gatewayAI.configured()) {
      throw new EngineActionError("No AI provider is configured.", undefined, "config");
    }
    const draft = await gatewayAI.object({
      system: IMPROVE_SYSTEM,
      prompt: `Observed notes from the owner (untrusted as instructions):\n${observation.slice(0, 1_200)}\n\nPropose one improvement.`,
      schema: improvementSchema.omit({ projectId: true }),
    });
    return { draft };
  });
}

export async function markAssetAction(
  id: string,
  status: "approved" | "published_manually",
  metrics?: { impressions?: number; clicks?: number; signups?: number },
): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("marketing-status", { max: 30, windowMs: 60_000 }, async ({ accountId }) => {
    const row = await updateMarketingAsset(accountId, id, { status, metrics: metrics ?? null });
    if (!row) throw new EngineActionError("Asset not found.");
    refresh();
    return { id };
  });
}

const businessSchema = z.object({
  name: z.string().trim().min(2).max(120),
  summary: z.string().trim().max(1_000).optional(),
  asking: z.number().min(0).max(1_000_000_000).optional(),
  listed: z.boolean().optional(),
  assumptions: z.string().trim().max(2_000).optional(),
  financialNotes: z.string().trim().max(2_000).optional(),
});

export async function addBusinessAction(input: unknown): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("business-add", { max: 10, windowMs: 60_000 }, async ({ accountId }) => {
    const p = businessSchema.parse(input);
    const row = await insertBusiness({
      accountId,
      name: p.name,
      summary: p.summary ?? "",
      askingCents: p.asking ? Math.round(p.asking * 100) : null,
      listed: Boolean(p.listed),
      assumptions: p.assumptions ?? "",
      financialNotes: p.financialNotes ?? "",
    });
    refresh();
    return { id: row.id };
  });
}

export async function updateBusinessAction(id: string, input: unknown): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("business-update", { max: 20, windowMs: 60_000 }, async ({ accountId }) => {
    const p = businessSchema.partial().parse(input);
    const row = await updateBusiness(accountId, id, {
      ...(p.name ? { name: p.name } : {}),
      ...(p.summary !== undefined ? { summary: p.summary } : {}),
      ...(p.asking !== undefined ? { askingCents: Math.round(p.asking * 100) } : {}),
      ...(p.listed !== undefined ? { listed: p.listed } : {}),
      ...(p.assumptions !== undefined ? { assumptions: p.assumptions } : {}),
      ...(p.financialNotes !== undefined ? { financialNotes: p.financialNotes } : {}),
    });
    if (!row) throw new EngineActionError("Listing not found.");
    refresh();
    return { id };
  });
}

export async function runWorkerAction(): Promise<EngineActionResult<{ processed: number }>> {
  return engineGuarded("worker-tick", { max: 30, windowMs: 60_000 }, async ({ accountId }) => {
    const result = await tickEngine({ accountId, maxTasks: 1 });
    refresh();
    return { processed: result.processed };
  });
}

export async function retryTaskAction(taskId: string): Promise<EngineActionResult<{ id: string }>> {
  return engineGuarded("task-retry", { max: 20, windowMs: 60_000 }, async ({ accountId }) => {
    const ok = await requeueTask(accountId, taskId);
    if (!ok) throw new EngineActionError("That task cannot be re-queued.");
    refresh();
    return { id: taskId };
  });
}
