import { and, desc, eq } from "drizzle-orm";
import { edb, schema } from "../db";
import type { PermissionScope } from "../types";
import type { ApprovalRow, ImprovementRow, MarketingAssetRow, OutreachRow, ProjectRow, ProspectRow } from "../schema";
import { isUuid } from "./core";

const { projects, approvals, prospects, outreach, marketingAssets, improvements } = schema;

/* ─────────────────────────────── Projects ──────────────────────────────── */

export async function insertProject(p: typeof projects.$inferInsert): Promise<ProjectRow> {
  const db = await edb();
  const [row] = await db.insert(projects).values(p).returning();
  return row;
}

export async function listProjects(accountId: string): Promise<ProjectRow[]> {
  const db = await edb();
  return db.select().from(projects).where(eq(projects.accountId, accountId)).orderBy(desc(projects.createdAt)).limit(100);
}

export async function getProject(accountId: string, id: string): Promise<ProjectRow | null> {
  if (!isUuid(id)) return null;
  const db = await edb();
  const [row] = await db.select().from(projects).where(and(eq(projects.accountId, accountId), eq(projects.id, id))).limit(1);
  return row ?? null;
}

export async function getProjectByExperiment(accountId: string, experimentId: string): Promise<ProjectRow | null> {
  const db = await edb();
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.accountId, accountId), eq(projects.experimentId, experimentId)))
    .orderBy(desc(projects.createdAt))
    .limit(1);
  return row ?? null;
}

export async function updateProject(accountId: string, id: string, patch: Partial<typeof projects.$inferInsert>): Promise<ProjectRow | null> {
  const db = await edb();
  const [row] = await db
    .update(projects)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(projects.accountId, accountId), eq(projects.id, id)))
    .returning();
  return row ?? null;
}

/* ─────────────────────────────── Approvals ─────────────────────────────── */

export async function findApproval(taskId: string, scope: PermissionScope): Promise<ApprovalRow | null> {
  const db = await edb();
  const [row] = await db
    .select()
    .from(approvals)
    .where(and(eq(approvals.taskId, taskId), eq(approvals.scope, scope)))
    .orderBy(desc(approvals.createdAt))
    .limit(1);
  return row ?? null;
}

export async function createApproval(a: typeof approvals.$inferInsert): Promise<ApprovalRow> {
  const db = await edb();
  const [row] = await db.insert(approvals).values(a).returning();
  return row;
}

export async function listApprovals(accountId: string, status?: ApprovalRow["status"]): Promise<ApprovalRow[]> {
  const db = await edb();
  const conds = [eq(approvals.accountId, accountId)];
  if (status) conds.push(eq(approvals.status, status));
  return db.select().from(approvals).where(and(...conds)).orderBy(desc(approvals.createdAt)).limit(100);
}

/** Decide a pending approval. Scoped to the account so another tenant's id is simply "not found". */
export async function decideApproval(accountId: string, id: string, decision: "approved" | "denied", userId: string): Promise<ApprovalRow | null> {
  if (!isUuid(id)) return null;
  const db = await edb();
  const [row] = await db
    .update(approvals)
    .set({ status: decision, decidedBy: userId, decidedAt: new Date() })
    .where(and(eq(approvals.accountId, accountId), eq(approvals.id, id), eq(approvals.status, "pending")))
    .returning();
  return row ?? null;
}

/* ─────────────────────────────── Prospects ─────────────────────────────── */

export async function insertProspect(p: typeof prospects.$inferInsert): Promise<ProspectRow> {
  const db = await edb();
  const [row] = await db.insert(prospects).values(p).returning();
  return row;
}

export async function listProspects(accountId: string): Promise<ProspectRow[]> {
  const db = await edb();
  return db.select().from(prospects).where(eq(prospects.accountId, accountId)).orderBy(desc(prospects.createdAt)).limit(500);
}

export async function getProspect(accountId: string, id: string): Promise<ProspectRow | null> {
  if (!isUuid(id)) return null;
  const db = await edb();
  const [row] = await db.select().from(prospects).where(and(eq(prospects.accountId, accountId), eq(prospects.id, id))).limit(1);
  return row ?? null;
}

export async function updateProspect(accountId: string, id: string, patch: Partial<typeof prospects.$inferInsert>): Promise<ProspectRow | null> {
  const db = await edb();
  const [row] = await db
    .update(prospects)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(prospects.accountId, accountId), eq(prospects.id, id)))
    .returning();
  return row ?? null;
}

export async function deleteProspect(accountId: string, id: string): Promise<boolean> {
  const db = await edb();
  const rows = await db.delete(prospects).where(and(eq(prospects.accountId, accountId), eq(prospects.id, id))).returning({ id: prospects.id });
  return rows.length > 0;
}

export async function insertOutreach(o: typeof outreach.$inferInsert): Promise<OutreachRow> {
  const db = await edb();
  const [row] = await db.insert(outreach).values(o).returning();
  return row;
}

export async function listOutreach(accountId: string): Promise<OutreachRow[]> {
  const db = await edb();
  return db.select().from(outreach).where(eq(outreach.accountId, accountId)).orderBy(desc(outreach.createdAt)).limit(500);
}

export async function updateOutreach(accountId: string, id: string, patch: Partial<typeof outreach.$inferInsert>): Promise<OutreachRow | null> {
  if (!isUuid(id)) return null;
  const db = await edb();
  const [row] = await db
    .update(outreach)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(outreach.accountId, accountId), eq(outreach.id, id)))
    .returning();
  return row ?? null;
}

/* ───────────────────────────── Marketing assets ────────────────────────── */

export async function insertMarketingAsset(a: typeof marketingAssets.$inferInsert): Promise<MarketingAssetRow> {
  const db = await edb();
  const [row] = await db.insert(marketingAssets).values(a).returning();
  return row;
}

export async function listMarketingAssets(accountId: string): Promise<MarketingAssetRow[]> {
  const db = await edb();
  return db.select().from(marketingAssets).where(eq(marketingAssets.accountId, accountId)).orderBy(desc(marketingAssets.createdAt)).limit(200);
}

export async function updateMarketingAsset(accountId: string, id: string, patch: Partial<typeof marketingAssets.$inferInsert>): Promise<MarketingAssetRow | null> {
  if (!isUuid(id)) return null;
  const db = await edb();
  const [row] = await db.update(marketingAssets).set(patch).where(and(eq(marketingAssets.accountId, accountId), eq(marketingAssets.id, id))).returning();
  return row ?? null;
}

/* ────────────────────────────── Improvements ───────────────────────────── */

export async function insertImprovement(i: typeof improvements.$inferInsert): Promise<ImprovementRow> {
  const db = await edb();
  const [row] = await db.insert(improvements).values(i).returning();
  return row;
}

export async function listImprovements(accountId: string): Promise<ImprovementRow[]> {
  const db = await edb();
  return db.select().from(improvements).where(eq(improvements.accountId, accountId)).orderBy(desc(improvements.createdAt)).limit(200);
}

export async function updateImprovement(accountId: string, id: string, patch: Partial<typeof improvements.$inferInsert>): Promise<ImprovementRow | null> {
  if (!isUuid(id)) return null;
  const db = await edb();
  const [row] = await db.update(improvements).set(patch).where(and(eq(improvements.accountId, accountId), eq(improvements.id, id))).returning();
  return row ?? null;
}
