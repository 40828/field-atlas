import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { edb, schema } from "../db";
import type { OpportunityData, StrategyKind } from "../types";
import type { EvidenceRow, ExperimentRow, OpportunityRow, StrategyRow } from "../schema";
import { isUuid } from "./core";

const { evidence, opportunities, strategies, experiments } = schema;

/* ─────────────────────────────── Evidence ──────────────────────────────── */

export interface NewEvidence {
  accountId: string;
  missionId: string;
  provider: string;
  query: string;
  url: string;
  title: string;
  snippet: string;
  publishedAt?: string | null;
}

/** Idempotent per (mission, url): re-running a gather task never duplicates sources. */
export async function insertEvidence(items: NewEvidence[]): Promise<number> {
  if (items.length === 0) return 0;
  const db = await edb();
  const rows = await db
    .insert(evidence)
    .values(items.map((i) => ({ ...i, publishedAt: i.publishedAt ?? null, title: i.title.slice(0, 300), snippet: i.snippet.slice(0, 1_200), url: i.url.slice(0, 600) })))
    .onConflictDoNothing({ target: [evidence.missionId, evidence.url] })
    .returning({ id: evidence.id });
  return rows.length;
}

export async function listEvidence(accountId: string, missionId: string): Promise<EvidenceRow[]> {
  if (!isUuid(missionId)) return [];
  const db = await edb();
  return db.select().from(evidence).where(and(eq(evidence.accountId, accountId), eq(evidence.missionId, missionId))).orderBy(asc(evidence.retrievedAt)).limit(300);
}

/* ───────────────────────────── Opportunities ───────────────────────────── */

export async function replaceOpportunities(
  accountId: string,
  missionId: string,
  items: Array<{ title: string; kind: StrategyKind; data: OpportunityData }>,
): Promise<OpportunityRow[]> {
  const db = await edb();
  // Idempotent re-run: a retried synthesis replaces its own previous output for this mission.
  await db.delete(opportunities).where(and(eq(opportunities.accountId, accountId), eq(opportunities.missionId, missionId)));
  if (items.length === 0) return [];
  return db
    .insert(opportunities)
    .values(items.map((i) => ({ accountId, missionId, title: i.title, kind: i.kind, data: i.data })))
    .returning();
}

export async function listOpportunities(accountId: string, missionId?: string): Promise<OpportunityRow[]> {
  const db = await edb();
  const conds = [eq(opportunities.accountId, accountId)];
  if (missionId && isUuid(missionId)) conds.push(eq(opportunities.missionId, missionId));
  return db.select().from(opportunities).where(and(...conds)).orderBy(desc(opportunities.researchedAt)).limit(200);
}

export async function getOpportunity(accountId: string, id: string): Promise<OpportunityRow | null> {
  if (!isUuid(id)) return null;
  const db = await edb();
  const [row] = await db.select().from(opportunities).where(and(eq(opportunities.accountId, accountId), eq(opportunities.id, id))).limit(1);
  return row ?? null;
}

/* ─────────────────────────────── Strategies ────────────────────────────── */

export async function replaceStrategies(
  accountId: string,
  missionId: string,
  items: Array<Omit<typeof strategies.$inferInsert, "accountId" | "missionId" | "id" | "createdAt">>,
): Promise<StrategyRow[]> {
  const db = await edb();
  await db.delete(strategies).where(and(eq(strategies.accountId, accountId), eq(strategies.missionId, missionId)));
  if (items.length === 0) return [];
  return db.insert(strategies).values(items.map((i) => ({ ...i, accountId, missionId }))).returning();
}

export async function listStrategies(accountId: string, missionId?: string): Promise<StrategyRow[]> {
  const db = await edb();
  const conds = [eq(strategies.accountId, accountId)];
  if (missionId && isUuid(missionId)) conds.push(eq(strategies.missionId, missionId));
  return db.select().from(strategies).where(and(...conds)).orderBy(desc(strategies.createdAt), asc(strategies.rank)).limit(200);
}

export async function getStrategy(accountId: string, id: string): Promise<StrategyRow | null> {
  if (!isUuid(id)) return null;
  const db = await edb();
  const [row] = await db.select().from(strategies).where(and(eq(strategies.accountId, accountId), eq(strategies.id, id))).limit(1);
  return row ?? null;
}

export async function setStrategyStatus(accountId: string, id: string, status: StrategyRow["status"], lessons?: string): Promise<void> {
  const db = await edb();
  await db
    .update(strategies)
    .set({ status, ...(lessons !== undefined ? { lessons } : {}) })
    .where(and(eq(strategies.accountId, accountId), eq(strategies.id, id)));
}

/** Titles of strategies the user (or a failed experiment) already abandoned: used to avoid blind retries. */
export async function listAbandonedTitles(accountId: string): Promise<string[]> {
  const db = await edb();
  const rows = await db
    .select({ title: opportunities.title })
    .from(strategies)
    .innerJoin(opportunities, eq(opportunities.id, strategies.opportunityId))
    .where(and(eq(strategies.accountId, accountId), inArray(strategies.status, ["abandoned", "rejected"])))
    .limit(100);
  return rows.map((r) => r.title);
}

/* ─────────────────────────────── Experiments ───────────────────────────── */

export async function insertExperiment(e: typeof experiments.$inferInsert): Promise<ExperimentRow> {
  const db = await edb();
  const [row] = await db.insert(experiments).values(e).returning();
  return row;
}

export async function listExperiments(accountId: string, missionId?: string): Promise<ExperimentRow[]> {
  const db = await edb();
  const conds = [eq(experiments.accountId, accountId)];
  if (missionId && isUuid(missionId)) conds.push(eq(experiments.missionId, missionId));
  return db.select().from(experiments).where(and(...conds)).orderBy(desc(experiments.createdAt)).limit(200);
}

export async function getExperiment(accountId: string, id: string): Promise<ExperimentRow | null> {
  if (!isUuid(id)) return null;
  const db = await edb();
  const [row] = await db.select().from(experiments).where(and(eq(experiments.accountId, accountId), eq(experiments.id, id))).limit(1);
  return row ?? null;
}

export async function updateExperiment(accountId: string, id: string, patch: Partial<typeof experiments.$inferInsert>): Promise<ExperimentRow | null> {
  const db = await edb();
  const [row] = await db.update(experiments).set(patch).where(and(eq(experiments.accountId, accountId), eq(experiments.id, id))).returning();
  return row ?? null;
}
