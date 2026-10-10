import { gatewayAI, type EngineAI } from "./ai";
import { ConfigError, CancelledError, PermanentError, RetryableError, errorMessage } from "./errors";
import { evaluateGate } from "./gate";
import { HANDLERS } from "./handlers";
import { assertCanRunAi, getEngineEntitlement } from "./entitlements";
import { emitEvent, getMissionById, getPermissions, updateMissionStatus } from "./repo/core";
import { createApproval, findApproval } from "./repo/ops";
import { spentCents } from "./repo/ledger";
import { claimNextTask, completeTask, failTask, parkTask, recoverStaleTasks, type FailOutcome } from "./repo/queue";
import { EngineActionError } from "./session";
import type { PermissionScope } from "./types";
import type { TaskRow } from "./schema";

export interface TickResult {
  recovered: { requeued: number; failed: number };
  processed: number;
  outcomes: Array<{ taskId: string; kind: string; result: string }>;
  remaining: boolean;
}

const AI_KINDS = new Set(["research.plan", "research.synthesize", "experiment.spec", "marketing.generate", "factory.build"]);

export async function tickEngine(opts: {
  accountId?: string;
  maxTasks?: number;
  now?: Date;
  ai?: EngineAI;
}): Promise<TickResult> {
  const now = opts.now ?? new Date();
  const ai = opts.ai ?? gatewayAI;
  const recovered = await recoverStaleTasks(now);
  const outcomes: TickResult["outcomes"] = [];
  const max = Math.min(opts.maxTasks ?? 1, 4);

  for (let i = 0; i < max; i += 1) {
    const task = await claimNextTask({ now, accountId: opts.accountId });
    if (!task) break;
    const result = await runClaimedTask(task, ai);
    outcomes.push({ taskId: task.id, kind: task.kind, result });
  }

  return { recovered, processed: outcomes.length, outcomes, remaining: false };
}

async function runClaimedTask(task: TaskRow, ai: EngineAI): Promise<string> {
  const mission = await getMissionById(task.missionId);
  if (!mission || mission.status !== "running") {
    await failTask(task, "Mission is no longer running.", { retryable: false });
    return "ignored";
  }

  const [perms, spent, entitlement] = await Promise.all([
    getPermissions(task.accountId),
    spentCents(task.accountId),
    getEngineEntitlement(task.accountId),
  ]);

  if (AI_KINDS.has(task.kind)) {
    try {
      assertCanRunAi(entitlement);
    } catch (err) {
      const msg = err instanceof EngineActionError ? err.message : errorMessage(err);
      await parkTask(task.id, "blocked", msg, "Wait until the daily AI quota resets, or upgrade.");
      await emitEvent({
        accountId: task.accountId,
        missionId: mission.id,
        taskId: task.id,
        type: "task.blocked",
        status: "needs_approval",
        title: "Daily AI quota reached",
        what: msg,
        why: "Quotas stop unbounded model spend on the free plan.",
        expected: "The task resumes after the window or an upgrade.",
        next: "Open Billing, or wait until tomorrow.",
      });
      return "blocked";
    }
  }

  const approved: PermissionScope[] = [];
  for (const scope of task.requiredPermissions) {
    const row = await findApproval(task.id, scope);
    if (row?.status === "approved") approved.push(scope);
  }
  if (task.resourceEstimate.costCents > 0) {
    const spend = await findApproval(task.id, "spend");
    if (spend?.status === "approved") approved.push("spend");
  }

  const gate = evaluateGate({
    required: task.requiredPermissions,
    costCents: task.resourceEstimate.costCents,
    grantedScopes: perms.scopes,
    spendLimitCents: perms.spendLimitCents,
    spentCents: spent,
    approvedForTask: approved,
    missionMaxSpendCents: mission.maxSpendCents,
  });

  if (!gate.allowed) {
    if (gate.kind === "denied") {
      await parkTask(task.id, "blocked", gate.reason, "Raise the spending limit yourself, or change the mission.");
      await emitEvent({
        accountId: task.accountId,
        missionId: mission.id,
        taskId: task.id,
        type: "task.blocked",
        status: "failed",
        title: "Action denied by spending policy",
        what: gate.reason,
        why: "Agents cannot raise their own spending limit.",
        expected: "No spend occurs.",
        next: "Change permissions on the Integrations page if you intend to allow this.",
      });
      return "denied";
    }

    const existing = await findApproval(task.id, gate.scope);
    if (!existing || existing.status === "denied" || existing.status === "expired") {
      await createApproval({
        accountId: task.accountId,
        missionId: mission.id,
        taskId: task.id,
        scope: gate.scope,
        title: `Approve “${gate.scope}” for ${task.title}`,
        detail: gate.reason,
        costCents: task.resourceEstimate.costCents,
      });
    }
    await parkTask(task.id, "awaiting_approval", gate.reason, `Approve the “${gate.scope}” request to continue.`);
    await emitEvent({
      accountId: task.accountId,
      missionId: mission.id,
      taskId: task.id,
      type: "approval.required",
      status: "needs_approval",
      title: "Your approval is required",
      what: gate.reason,
      why: "High-impact actions never proceed on the model's say-so.",
      expected: "You approve or deny from the mission or settings page.",
      next: "Open pending approvals.",
    });
    return "awaiting_approval";
  }

  const handler = HANDLERS[task.kind];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), task.timeoutMs);
  try {
    const result = await handler({ task, mission, ai, signal: controller.signal });
    if (!result.verification.passed && task.kind !== "factory.build") {
      // Research/strategy verification failure is a real failure; factory.build may store drafts.
      const outcome = await failTask(task, result.verification.failures.join("; ") || "Verification failed.", {
        retryable: true,
        verification: result.verification,
      });
      await emitFailure(task, mission.id, result.verification.failures.join("; ") || "Verification failed.", outcome);
      return outcome;
    }
    const ok = await completeTask(task.id, result);
    return ok ? "succeeded" : "ignored";
  } catch (err) {
    if (err instanceof CancelledError) {
      await failTask(task, "Mission was paused or cancelled.", { retryable: false });
      return "cancelled";
    }
    if (err instanceof ConfigError) {
      await parkTask(task.id, "blocked", err.message, err.fix);
      await updateMissionStatus(mission.accountId, mission.id, "blocked", { blockedReason: `${err.message} ${err.fix}` });
      await emitEvent({
        accountId: task.accountId,
        missionId: mission.id,
        taskId: task.id,
        type: "config.missing",
        status: "failed",
        title: "Configuration required",
        what: err.message,
        why: "Retrying cannot create missing credentials.",
        expected: "You add the integration, then resume the mission.",
        evidence: [err.fix],
        next: err.fix,
      });
      return "blocked";
    }
    if (err instanceof PermanentError) {
      const outcome = await failTask(task, err.message, { retryable: false });
      await emitFailure(task, mission.id, err.message, outcome);
      return outcome;
    }
    const retryable = err instanceof RetryableError || (err as { name?: string })?.name === "AbortError";
    const msg = errorMessage(err);
    const outcome = await failTask(task, msg, { retryable });
    await emitFailure(task, mission.id, msg, outcome);
    return outcome;
  } finally {
    clearTimeout(timer);
  }
}

async function emitFailure(task: TaskRow, missionId: string, error: string, outcome: FailOutcome) {
  await emitEvent({
    accountId: task.accountId,
    missionId,
    taskId: task.id,
    type: outcome === "retrying" ? "task.retry" : "task.failed",
    status: "failed",
    title: outcome === "retrying" ? "Task will retry" : "Task failed",
    what: error,
    why: outcome === "retrying" ? "The failure looks transient (network, rate limit, or invalid model output)." : "Retries are exhausted or the error is permanent.",
    expected: outcome === "retrying" ? "The same task runs again after backoff." : "Dependent tasks are cancelled.",
    next: outcome === "retrying" ? "Wait for the next worker tick." : "Inspect the error and change the approach if needed.",
  });
}
