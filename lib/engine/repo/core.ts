import { and, desc, eq, inArray, lt, gte, sql, count } from "drizzle-orm";
import { edb, schema } from "../db";
import type { EngineEventStatus, MissionStatus, PermissionScope } from "../types";
import { DEFAULT_TARGET_CENTS, PERMISSION_SCOPES } from "../types";
import type { MissionRow, PermissionsRow } from "../schema";

const { missions, events, auditLog, enginePermissions, tasks } = schema;

/* ─────────────────────────────── Missions ──────────────────────────────── */

export interface NewMission {
  accountId: string;
  createdBy: string;
  objective: string;
  targetCents?: number;
  timeframeDays?: number;
  startingCapitalCents?: number;
  maxSpendCents?: number;
  skills?: string;
  categories?: string[];
  riskTolerance?: "low" | "medium" | "high";
  constraints?: string;
  zeroCapital?: boolean;
}

export function missionTitle(objective: string): string {
  const t = objective.replace(/\s+/g, " ").trim();
  return t.length > 80 ? `${t.slice(0, 77)}…` : t;
}

export async function insertMission(m: NewMission): Promise<MissionRow> {
  const db = await edb();
  const [row] = await db
    .insert(missions)
    .values({
      accountId: m.accountId,
      createdBy: m.createdBy,
      title: missionTitle(m.objective),
      objective: m.objective,
      // Spec: no stated target → aspirational default. It is an objective, not a promise.
      targetCents: m.targetCents && m.targetCents > 0 ? m.targetCents : DEFAULT_TARGET_CENTS,
      timeframeDays: m.timeframeDays ?? null,
      startingCapitalCents: m.startingCapitalCents ?? 0,
      maxSpendCents: m.maxSpendCents ?? 0,
      skills: m.skills ?? "",
      categories: m.categories ?? [],
      riskTolerance: m.riskTolerance ?? "medium",
      constraints: m.constraints ?? "",
      zeroCapital: m.zeroCapital ?? (m.maxSpendCents ?? 0) === 0,
    })
    .returning();
  return row;
}

export async function listMissions(accountId: string): Promise<MissionRow[]> {
  const db = await edb();
  return db.select().from(missions).where(eq(missions.accountId, accountId)).orderBy(desc(missions.createdAt)).limit(200);
}

export async function getMission(accountId: string, id: string): Promise<MissionRow | null> {
  if (!isUuid(id)) return null;
  const db = await edb();
  const [row] = await db.select().from(missions).where(and(eq(missions.accountId, accountId), eq(missions.id, id))).limit(1);
  return row ?? null;
}

/** Internal (worker) lookup by id only; the worker acts on rows it already claimed. */
export async function getMissionById(id: string): Promise<MissionRow | null> {
  const db = await edb();
  const [row] = await db.select().from(missions).where(eq(missions.id, id)).limit(1);
  return row ?? null;
}

export async function updateMissionStatus(
  accountId: string,
  id: string,
  status: MissionStatus,
  extra: { blockedReason?: string | null } = {},
): Promise<MissionRow | null> {
  const db = await edb();
  const now = new Date();
  const [row] = await db
    .update(missions)
    .set({
      status,
      updatedAt: now,
      blockedReason: extra.blockedReason ?? null,
      ...(status === "running" ? { startedAt: sql`coalesce(${missions.startedAt}, ${now.toISOString()}::timestamptz)` } : {}),
      ...(status === "completed" || status === "cancelled" || status === "failed" ? { endedAt: now } : {}),
    })
    .where(and(eq(missions.accountId, accountId), eq(missions.id, id)))
    .returning();
  return row ?? null;
}

export async function countActiveMissions(accountId: string): Promise<number> {
  const db = await edb();
  const [r] = await db
    .select({ n: count() })
    .from(missions)
    .where(and(eq(missions.accountId, accountId), inArray(missions.status, ["running", "paused", "blocked"])));
  return Number(r?.n ?? 0);
}

export async function deleteMission(accountId: string, id: string): Promise<boolean> {
  const db = await edb();
  const rows = await db.delete(missions).where(and(eq(missions.accountId, accountId), eq(missions.id, id))).returning({ id: missions.id });
  return rows.length > 0;
}

export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/* ──────────────────────────────── Events ───────────────────────────────── */

export interface NewEvent {
  accountId: string;
  missionId?: string | null;
  taskId?: string | null;
  type: string;
  status: EngineEventStatus;
  title: string;
  what: string;
  why: string;
  expected: string;
  evidence?: string[];
  next: string;
}

/** Events are append-only facts about what the engine actually did. Never pre-populated with fiction. */
export async function emitEvent(e: NewEvent): Promise<void> {
  const db = await edb();
  await db.insert(events).values({
    accountId: e.accountId,
    missionId: e.missionId ?? null,
    taskId: e.taskId ?? null,
    type: e.type,
    status: e.status,
    title: e.title.slice(0, 200),
    what: e.what.slice(0, 1_500),
    why: e.why.slice(0, 1_000),
    expected: e.expected.slice(0, 600),
    evidence: (e.evidence ?? []).slice(0, 10).map((x) => x.slice(0, 300)),
    next: e.next.slice(0, 600),
  });
}

export interface EventFilter {
  missionId?: string;
  type?: string;
  status?: EngineEventStatus;
  since?: Date;
  before?: Date;
  limit?: number;
}

export async function listEvents(accountId: string, f: EventFilter = {}) {
  const db = await edb();
  const conds = [eq(events.accountId, accountId)];
  if (f.missionId && isUuid(f.missionId)) conds.push(eq(events.missionId, f.missionId));
  if (f.type) conds.push(sql`${events.type} like ${`${f.type.replace(/[%_]/g, "")}%`}`);
  if (f.status) conds.push(eq(events.status, f.status));
  if (f.since) conds.push(gte(events.createdAt, f.since));
  if (f.before) conds.push(lt(events.createdAt, f.before));
  return db
    .select()
    .from(events)
    .where(and(...conds))
    .orderBy(desc(events.createdAt))
    .limit(Math.min(f.limit ?? 50, 200));
}

/* ─────────────────────────── Permissions & audit ───────────────────────── */

export const DEFAULT_PERMISSIONS = { scopes: ["research"] as PermissionScope[], spendLimitCents: 0, zeroCapitalMode: true };

export async function getPermissions(accountId: string): Promise<Pick<PermissionsRow, "scopes" | "spendLimitCents" | "zeroCapitalMode">> {
  const db = await edb();
  const [row] = await db.select().from(enginePermissions).where(eq(enginePermissions.accountId, accountId)).limit(1);
  return row ?? DEFAULT_PERMISSIONS;
}

/** ONLY called from user-session server actions (see `lib/engine/actions.ts`). Never from the worker. */
export async function savePermissions(
  accountId: string,
  p: { scopes: PermissionScope[]; spendLimitCents: number; zeroCapitalMode: boolean },
): Promise<void> {
  const db = await edb();
  const scopes = PERMISSION_SCOPES.filter((s) => p.scopes.includes(s) || s === "research");
  const values = { scopes: [...scopes], spendLimitCents: Math.max(0, Math.round(p.spendLimitCents)), zeroCapitalMode: p.zeroCapitalMode, updatedAt: new Date() };
  await db
    .insert(enginePermissions)
    .values({ accountId, ...values })
    .onConflictDoUpdate({ target: enginePermissions.accountId, set: values });
}

export async function audit(accountId: string, actor: string, action: string, target?: string | null, detail: Record<string, unknown> = {}): Promise<void> {
  const db = await edb();
  await db.insert(auditLog).values({ accountId, actor, action, target: target ?? null, detail });
}

export async function listAudit(accountId: string, limit = 100) {
  const db = await edb();
  return db.select().from(auditLog).where(eq(auditLog.accountId, accountId)).orderBy(desc(auditLog.createdAt)).limit(limit);
}

/** AI-consuming task starts in the last 24 h (for plan quotas and the zero-capital tracker). */
export async function countAiTasksSince(accountId: string, since: Date): Promise<number> {
  const db = await edb();
  const [r] = await db
    .select({ n: count() })
    .from(tasks)
    .where(and(eq(tasks.accountId, accountId), gte(tasks.startedAt, since), inArray(tasks.kind, ["research.plan", "research.synthesize", "experiment.spec", "marketing.generate", "factory.build"])));
  return Number(r?.n ?? 0);
}

export async function countTasksSince(accountId: string, kind: string, since: Date): Promise<number> {
  const db = await edb();
  const [r] = await db
    .select({ n: count() })
    .from(tasks)
    .where(and(eq(tasks.accountId, accountId), gte(tasks.startedAt, since), sql`${tasks.kind} = ${kind}`, eq(tasks.status, "succeeded")));
  return Number(r?.n ?? 0);
}
