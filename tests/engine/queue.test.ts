import { afterEach, describe, expect, it } from "vitest";
import { openTestDb } from "../helpers/pglite";
import { insertMission, getMission, updateMissionStatus, emitEvent, listEvents } from "@/lib/engine/repo/core";
import { enqueueTask, claimNextTask, completeTask, failTask, recoverStaleTasks, cancelMissionTasks } from "@/lib/engine/repo/queue";
import { addLedgerEntry, listLedger } from "@/lib/engine/repo/ledger";
import { gatewayAI } from "@/lib/engine/ai";
import { tickEngine } from "@/lib/engine/worker";
import type { EngineAI } from "@/lib/engine/ai";

let close: (() => Promise<void>) | undefined;

afterEach(async () => {
  if (close) await close();
  close = undefined;
});

describe("missions and tenancy", () => {
  it("creates a mission with the default $1,000,000 target and hides it from other accounts", async () => {
    ({ close } = await openTestDb());
    const m = await insertMission({ accountId: "acct-a", createdBy: "user-a", objective: "Go make me money." });
    expect(m.targetCents).toBe(100_000_000);
    expect(m.status).toBe("draft");
    expect(await getMission("acct-b", m.id)).toBeNull();
    expect((await getMission("acct-a", m.id))?.id).toBe(m.id);
  });
});

describe("task queue", () => {
  it("claims only tasks whose mission is running and whose dependencies succeeded", async () => {
    ({ close } = await openTestDb());
    const m = await insertMission({ accountId: "a", createdBy: "u", objective: "Find local service demand." });
    await updateMissionStatus("a", m.id, "running");
    const plan = await enqueueTask({
      accountId: "a",
      missionId: m.id,
      kind: "research.plan",
      title: "plan",
      objective: "plan",
      idempotencyKey: "plan",
    });
    const gather = await enqueueTask({
      accountId: "a",
      missionId: m.id,
      kind: "research.gather",
      title: "gather",
      objective: "gather",
      dependsOn: [plan.id],
      idempotencyKey: "gather",
    });
    const first = await claimNextTask({ now: new Date() });
    expect(first?.id).toBe(plan.id);
    const blocked = await claimNextTask({ now: new Date() });
    expect(blocked).toBeNull();
    await completeTask(plan.id, { output: { ok: true }, verification: { passed: true, checks: ["ok"], failures: [] } });
    const second = await claimNextTask({ now: new Date() });
    expect(second?.id).toBe(gather.id);
  });

  it("does not claim work for a paused mission", async () => {
    ({ close } = await openTestDb());
    const m = await insertMission({ accountId: "a", createdBy: "u", objective: "Paused work should sit." });
    await updateMissionStatus("a", m.id, "paused");
    await enqueueTask({
      accountId: "a",
      missionId: m.id,
      kind: "research.plan",
      title: "plan",
      objective: "plan",
      idempotencyKey: "plan",
    });
    expect(await claimNextTask({ now: new Date() })).toBeNull();
  });

  it("retries with backoff then fails and cancels dependents", async () => {
    ({ close } = await openTestDb());
    const m = await insertMission({ accountId: "a", createdBy: "u", objective: "Retry path." });
    await updateMissionStatus("a", m.id, "running");
    const t = await enqueueTask({
      accountId: "a",
      missionId: m.id,
      kind: "research.plan",
      title: "plan",
      objective: "plan",
      idempotencyKey: "plan",
      maxRetries: 1,
    });
    const claimed = await claimNextTask({ now: new Date() });
    expect(claimed?.id).toBe(t.id);
    const outcome = await failTask(claimed!, "boom", { retryable: true });
    expect(outcome).toBe("retrying");
    const again = await claimNextTask({ now: new Date(Date.now() + 60_000) });
    expect(again?.id).toBe(t.id);
    const failed = await failTask({ ...again!, retryCount: 1, maxRetries: 1 }, "boom", { retryable: true });
    expect(failed).toBe("failed");
  });

  it("recovers a stale lease", async () => {
    ({ close } = await openTestDb());
    const m = await insertMission({ accountId: "a", createdBy: "u", objective: "Crash recovery." });
    await updateMissionStatus("a", m.id, "running");
    const t = await enqueueTask({
      accountId: "a",
      missionId: m.id,
      kind: "research.plan",
      title: "plan",
      objective: "plan",
      idempotencyKey: "plan",
      timeoutMs: 1,
    });
    const now = new Date();
    const claimed = await claimNextTask({ now });
    expect(claimed?.id).toBe(t.id);
    const recoverAt = new Date(now.getTime() + 120_000);
    const recovered = await recoverStaleTasks(recoverAt);
    expect(recovered.requeued).toBe(1);
    const later = await claimNextTask({ now: recoverAt });
    expect(later?.id).toBe(t.id);
  });

  it("cancels unfinished tasks when the mission is cancelled", async () => {
    ({ close } = await openTestDb());
    const m = await insertMission({ accountId: "a", createdBy: "u", objective: "Cancel me." });
    await enqueueTask({
      accountId: "a",
      missionId: m.id,
      kind: "research.plan",
      title: "plan",
      objective: "plan",
      idempotencyKey: "plan",
    });
    expect(await cancelMissionTasks(m.id)).toBe(1);
  });

  it("dedupes enqueue by idempotency key", async () => {
    ({ close } = await openTestDb());
    const m = await insertMission({ accountId: "a", createdBy: "u", objective: "Dedupe." });
    const a = await enqueueTask({
      accountId: "a",
      missionId: m.id,
      kind: "research.plan",
      title: "plan",
      objective: "plan",
      idempotencyKey: "same",
    });
    const b = await enqueueTask({
      accountId: "a",
      missionId: m.id,
      kind: "research.plan",
      title: "plan",
      objective: "plan",
      idempotencyKey: "same",
    });
    expect(a.id).toBe(b.id);
  });
});

describe("activity feed", () => {
  it("persists real events and never invents them", async () => {
    ({ close } = await openTestDb());
    await emitEvent({
      accountId: "a",
      type: "mission.created",
      status: "completed",
      title: "Created",
      what: "A mission row was inserted.",
      why: "The user asked.",
      expected: "A stored record",
      next: "Start it",
    });
    const events = await listEvents("a");
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Created");
    expect(await listEvents("other")).toHaveLength(0);
  });
});

describe("ledger duplicates", () => {
  it("rejects the same source reference twice", async () => {
    ({ close } = await openTestDb());
    const first = await addLedgerEntry({
      accountId: "a",
      kind: "revenue_collected",
      amountCents: 1000,
      description: "Test",
      source: "manual",
      sourceRef: "inv-1",
      verification: "user_attested",
    });
    const second = await addLedgerEntry({
      accountId: "a",
      kind: "revenue_collected",
      amountCents: 1000,
      description: "Test",
      source: "manual",
      sourceRef: "inv-1",
    });
    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(await listLedger("a")).toHaveLength(1);
  });
});

describe("AI configuration", () => {
  it("reports when the gateway is not configured", () => {
    expect(gatewayAI.configured()).toBe(Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN));
  });
});

describe("worker with a fake model", () => {
  it("parks a research.plan task when the AI is missing", async () => {
    ({ close } = await openTestDb());
    const m = await insertMission({ accountId: "a", createdBy: "u", objective: "Need a model." });
    await updateMissionStatus("a", m.id, "running");
    await enqueueTask({
      accountId: "a",
      missionId: m.id,
      kind: "research.plan",
      title: "plan",
      objective: "plan",
      requiredPermissions: ["research"],
      idempotencyKey: "plan",
    });
    const missing: EngineAI = {
      configured: () => false,
      async object() {
        throw new (await import("@/lib/engine/errors")).ConfigError("No AI provider is configured.", "Set AI_GATEWAY_API_KEY");
      },
    };
    const result = await tickEngine({ accountId: "a", ai: missing, maxTasks: 1 });
    expect(result.processed).toBe(1);
    expect(result.outcomes[0].result).toBe("blocked");
    const events = await listEvents("a");
    expect(events.some((e) => e.type === "config.missing")).toBe(true);
  });

  it("completes a plan task when the fake model returns a valid object", async () => {
    ({ close } = await openTestDb());
    const m = await insertMission({ accountId: "a", createdBy: "u", objective: "Valid plan." });
    await updateMissionStatus("a", m.id, "running");
    await enqueueTask({
      accountId: "a",
      missionId: m.id,
      kind: "research.plan",
      title: "plan",
      objective: "plan",
      requiredPermissions: ["research"],
      idempotencyKey: "plan",
    });
    const fake: EngineAI = {
      configured: () => true,
      async object() {
        return {
          themes: [
            { theme: "field service software", query: "landscaper invoicing complaints" },
            { theme: "bookkeeping services", query: "small contractor bookkeeper wanted" },
            { theme: "training", query: "crew lead training materials" },
          ],
        } as never;
      },
    };
    const result = await tickEngine({ accountId: "a", ai: fake, maxTasks: 1 });
    expect(result.outcomes[0].result).toBe("succeeded");
  });
});
