import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { edb, schema, type EngineDb } from "../db";
import { backoffMs } from "../gate";
import type { PermissionScope, TaskKind, TaskStatus } from "../types";
import type { TaskRow } from "../schema";
import { isUuid } from "./core";

const { tasks, missions } = schema;

/**
 * Durable, database-backed task queue.
 *  - claim:      one atomic UPDATE … FOR UPDATE SKIP LOCKED statement (safe under concurrent workers)
 *  - leases:     a claimed task holds a lease; crashed workers are recovered by `recoverStaleTasks`
 *  - retries:    exponential backoff via `next_run_at`
 *  - dedupe:     UNIQUE (mission_id, idempotency_key)
 *  - dependency: a task is claimable only when all of its `depends_on` ids have status = succeeded
 *  - control:    only tasks of missions with status = running are ever claimed (pause/cancel)
 */

export interface NewTask {
  accountId: string;
  missionId: string;
  kind: TaskKind;
  title: string;
  objective: string;
  description?: string;
  priority?: number;
  dependsOn?: string[];
  requiredPermissions?: PermissionScope[];
  resourceEstimate?: { aiCalls: number; costCents: number; seconds: number };
  input?: Record<string, unknown>;
  idempotencyKey: string;
  maxRetries?: number;
  timeoutMs?: number;
  nextAction?: string;
}

export async function enqueueTask(t: NewTask, db?: EngineDb): Promise<TaskRow> {
  const d = db ?? (await edb());
  const inserted = await d
    .insert(tasks)
    .values({
      accountId: t.accountId,
      missionId: t.missionId,
      kind: t.kind,
      title: t.title,
      objective: t.objective,
      description: t.description ?? "",
      priority: t.priority ?? 50,
      dependsOn: t.dependsOn ?? [],
      requiredPermissions: t.requiredPermissions ?? [],
      resourceEstimate: t.resourceEstimate ?? { aiCalls: 0, costCents: 0, seconds: 30 },
      input: t.input ?? {},
      idempotencyKey: t.idempotencyKey,
      maxRetries: t.maxRetries ?? 3,
      timeoutMs: t.timeoutMs ?? 120_000,
      nextAction: t.nextAction ?? null,
    })
    .onConflictDoNothing({ target: [tasks.missionId, tasks.idempotencyKey] })
    .returning();
  if (inserted[0]) return inserted[0];
  const [existing] = await d
    .select()
    .from(tasks)
    .where(and(eq(tasks.missionId, t.missionId), eq(tasks.idempotencyKey, t.idempotencyKey)))
    .limit(1);
  return existing;
}

export async function getTask(id: string): Promise<TaskRow | null> {
  const db = await edb();
  const [row] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return row ?? null;
}

export async function listTasks(accountId: string, missionId?: string): Promise<TaskRow[]> {
  const db = await edb();
  const conds = [eq(tasks.accountId, accountId)];
  if (missionId && isUuid(missionId)) conds.push(eq(tasks.missionId, missionId));
  return db.select().from(tasks).where(and(...conds)).orderBy(desc(tasks.priority), asc(tasks.createdAt)).limit(300);
}

function rowsOf(res: unknown): Array<Record<string, unknown>> {
  const r = res as { rows?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
  return Array.isArray(r) ? r : (r.rows ?? []);
}

/** Atomically claim the highest-priority runnable task. Returns null when nothing is runnable. */
export async function claimNextTask(opts: { now: Date; accountId?: string }): Promise<TaskRow | null> {
  const db = await edb();
  const nowIso = opts.now.toISOString();
  const acct = opts.accountId ? sql`and c.account_id = ${opts.accountId}` : sql``;
  const res = await db.execute(sql`
    update engine_tasks t
       set status = 'running',
           started_at = ${nowIso}::timestamptz,
           lease_expires_at = ${nowIso}::timestamptz + make_interval(secs => (t.timeout_ms / 1000.0) + 30),
           updated_at = ${nowIso}::timestamptz,
           error = null
     where t.id = (
       select c.id
         from engine_tasks c
         join engine_missions m on m.id = c.mission_id
        where c.status = 'pending'
          and c.next_run_at <= ${nowIso}::timestamptz
          and m.status = 'running'
          ${acct}
          and not exists (
            select 1
              from jsonb_array_elements_text(c.depends_on) as dep(id)
              join engine_tasks d on d.id::text = dep.id
             where d.status <> 'succeeded')
        order by c.priority desc, c.created_at asc
        for update of c skip locked
        limit 1)
     returning t.id`);
  const id = rowsOf(res)[0]?.id as string | undefined;
  return id ? getTask(id) : null;
}

/** Marks a running task done. Returns false if it was cancelled/re-queued while the handler ran. */
export async function completeTask(
  id: string,
  result: { output: Record<string, unknown>; verification: { passed: boolean; checks: string[]; failures: string[] }; nextAction?: string },
  now = new Date(),
): Promise<boolean> {
  const db = await edb();
  const rows = await db
    .update(tasks)
    .set({
      status: "succeeded",
      output: result.output,
      verification: result.verification,
      nextAction: result.nextAction ?? null,
      completedAt: now,
      leaseExpiresAt: null,
      error: null,
      updatedAt: now,
    })
    .where(and(eq(tasks.id, id), eq(tasks.status, "running")))
    .returning({ id: tasks.id });
  return rows.length > 0;
}

export type FailOutcome = "retrying" | "failed" | "ignored";

/** Retryable failure → backoff and try again until `maxRetries`; otherwise terminal failure. */
export async function failTask(
  task: Pick<TaskRow, "id" | "retryCount" | "maxRetries" | "missionId">,
  error: string,
  opts: { retryable: boolean; now?: Date; verification?: { passed: boolean; checks: string[]; failures: string[] } },
): Promise<FailOutcome> {
  const db = await edb();
  const now = opts.now ?? new Date();
  const canRetry = opts.retryable && task.retryCount < task.maxRetries;
  if (canRetry) {
    const rows = await db
      .update(tasks)
      .set({
        status: "pending",
        retryCount: task.retryCount + 1,
        nextRunAt: new Date(now.getTime() + backoffMs(task.retryCount)),
        error,
        verification: opts.verification ?? null,
        leaseExpiresAt: null,
        updatedAt: now,
      })
      .where(and(eq(tasks.id, task.id), eq(tasks.status, "running")))
      .returning({ id: tasks.id });
    return rows.length ? "retrying" : "ignored";
  }
  const rows = await db
    .update(tasks)
    .set({ status: "failed", error, verification: opts.verification ?? null, completedAt: now, leaseExpiresAt: null, updatedAt: now })
    .where(and(eq(tasks.id, task.id), eq(tasks.status, "running")))
    .returning({ id: tasks.id });
  if (rows.length) await cancelDependents(task.missionId);
  return rows.length ? "failed" : "ignored";
}

/** Park a running task (needs approval / needs configuration) without consuming a retry. */
export async function parkTask(id: string, status: Extract<TaskStatus, "awaiting_approval" | "blocked">, reason: string, nextAction: string): Promise<void> {
  const db = await edb();
  await db
    .update(tasks)
    .set({ status, error: reason, nextAction, leaseExpiresAt: null, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.status, "running")));
}

/** Return a parked task to the queue (after approval, or after configuration was fixed). */
export async function requeueTask(accountId: string, id: string): Promise<boolean> {
  const db = await edb();
  const rows = await db
    .update(tasks)
    .set({ status: "pending", error: null, nextRunAt: new Date(), updatedAt: new Date() })
    .where(and(eq(tasks.accountId, accountId), eq(tasks.id, id), inArray(tasks.status, ["awaiting_approval", "blocked", "failed"])))
    .returning({ id: tasks.id });
  return rows.length > 0;
}

/** Cancel tasks whose dependencies can never succeed (failed or cancelled). Repeats until stable. */
export async function cancelDependents(missionId: string): Promise<number> {
  const db = await edb();
  let total = 0;
  for (let i = 0; i < 20; i += 1) {
    const res = await db.execute(sql`
      update engine_tasks t
         set status = 'cancelled', error = 'A task this depends on did not succeed.', completed_at = now(), updated_at = now()
       where t.mission_id = ${missionId}
         and t.status in ('pending', 'blocked', 'awaiting_approval')
         and exists (
           select 1
             from jsonb_array_elements_text(t.depends_on) as dep(id)
             join engine_tasks d on d.id::text = dep.id
            where d.status in ('failed', 'cancelled'))
      returning t.id`);
    const n = rowsOf(res).length;
    total += n;
    if (n === 0) break;
  }
  return total;
}

/**
 * Failure recovery. A task whose worker died keeps status = running with an expired lease.
 * Re-queue it (counting an attempt) or fail it if it has no attempts left.
 */
export async function recoverStaleTasks(now = new Date()): Promise<{ requeued: number; failed: number }> {
  const db = await edb();
  const nowIso = now.toISOString();
  const requeued = rowsOf(
    await db.execute(sql`
      update engine_tasks
         set status = 'pending', retry_count = retry_count + 1, lease_expires_at = null,
             next_run_at = ${nowIso}::timestamptz, error = 'Worker stopped before finishing; task was re-queued.', updated_at = ${nowIso}::timestamptz
       where status = 'running' and lease_expires_at < ${nowIso}::timestamptz and retry_count < max_retries
       returning id`),
  ).length;
  const failedRows = rowsOf(
    await db.execute(sql`
      update engine_tasks
         set status = 'failed', lease_expires_at = null, completed_at = ${nowIso}::timestamptz,
             error = 'Worker stopped repeatedly before finishing this task.', updated_at = ${nowIso}::timestamptz
       where status = 'running' and lease_expires_at < ${nowIso}::timestamptz and retry_count >= max_retries
       returning mission_id`),
  );
  for (const mid of new Set(failedRows.map((r) => r.mission_id as string))) await cancelDependents(mid);
  return { requeued, failed: failedRows.length };
}

/** Cancel everything unfinished for a mission (mission cancelled/deleted). */
export async function cancelMissionTasks(missionId: string): Promise<number> {
  const db = await edb();
  const rows = await db
    .update(tasks)
    .set({ status: "cancelled", error: "Mission was cancelled.", completedAt: new Date(), leaseExpiresAt: null, updatedAt: new Date() })
    .where(and(eq(tasks.missionId, missionId), inArray(tasks.status, ["pending", "running", "awaiting_approval", "blocked"])))
    .returning({ id: tasks.id });
  return rows.length;
}

/** True when the task's mission is still running (cooperative cancellation check for handlers). */
export async function missionStillRunning(missionId: string): Promise<boolean> {
  const db = await edb();
  const [r] = await db.select({ status: missions.status }).from(missions).where(eq(missions.id, missionId)).limit(1);
  return r?.status === "running";
}

export async function countRunnable(accountId?: string, now = new Date()): Promise<number> {
  const db = await edb();
  const acct = accountId ? sql`and t.account_id = ${accountId}` : sql``;
  const res = await db.execute(sql`
    select count(*)::int as n from engine_tasks t join engine_missions m on m.id = t.mission_id
     where t.status = 'pending' and m.status = 'running' and t.next_run_at <= ${now.toISOString()}::timestamptz ${acct}`);
  return Number(rowsOf(res)[0]?.n ?? 0);
}

/** Pending/running work exists for a mission (used to show "working" vs "waiting for you"). */
export async function countOpenTasks(missionId: string): Promise<number> {
  const db = await edb();
  const res = await db.execute(sql`select count(*)::int as n from engine_tasks where mission_id = ${missionId} and status in ('pending','running')`);
  return Number(rowsOf(res)[0]?.n ?? 0);
}
