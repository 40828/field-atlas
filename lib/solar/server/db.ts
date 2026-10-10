import "server-only";
import { io } from "next/cache";
import { and, asc, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { computeBomSummary } from "../bom";
import { generateBom, generateDocument, type SiteParams } from "../generate";
import type { SiteMetadata } from "../schemas";
import type {
  ApprovalState,
  BlueprintAnalysis,
  BomLineItem,
  DashboardMetrics,
  DealOutcome,
  Proposal,
  ProposalDetail,
} from "../types";
import { getDb, schema } from "./database/client";
import type { ProposalRow, UploadRow } from "./database/schema";

const { proposals, bomItems, uploads } = schema;

/**
 * Account-scoped repository (Neon Postgres via Drizzle).
 *
 * EVERY function takes the caller's `accountId` and filters on it, so a customer can only ever
 * read or write their own rows. Proposal ids are `PRP-<seq>`; `parseSeq` is the only place
 * that turns the public id back into a number.
 *
 * `await io()` marks the work after it as request-time so Cache Components keeps live data out
 * of the static shell.
 *
 * NOTE: server-only. Never import this module from a Client Component.
 */

const toId = (seq: number) => `PRP-${seq}`;
const parseSeq = (id: string): number | null => {
  const m = /^PRP-(\d{4,6})$/.exec(id);
  return m ? Number(m[1]) : null;
};

function toProposal(r: ProposalRow): Proposal {
  return {
    id: toId(r.seq),
    projectName: r.projectName,
    clientName: r.clientName,
    address: r.address,
    buildingType: r.buildingType,
    material: r.material,
    jurisdiction: r.jurisdiction,
    zoningCode: r.zoningCode,
    status: r.status,
    approval: r.approval,
    outcome: r.outcome,
    squareFeet: r.squareFeet,
    fileName: r.fileName,
    fileSizeBytes: r.fileSizeBytes,
    pageCount: r.pageCount,
    estimatedValue: r.estimatedValue,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/* ───────────────────────────────── Queries ─────────────────────────────── */

export async function listProposals(accountId: string): Promise<Proposal[]> {
  await io();
  const rows = await getDb()
    .select()
    .from(proposals)
    .where(eq(proposals.accountId, accountId))
    .orderBy(desc(proposals.createdAt))
    .limit(500);
  return rows.map(toProposal);
}

const DAY_MS = 86_400_000;

/** Percent change, or `null` when there is nothing earlier to compare against. */
const pctChange = (current: number, previous: number) =>
  previous === 0 ? null : Math.round(((current - previous) / previous) * 1000) / 10;

function winRate(rows: { outcome: DealOutcome }[]) {
  const won = rows.filter((r) => r.outcome === "won").length;
  const lost = rows.filter((r) => r.outcome === "lost").length;
  return won + lost === 0 ? 0 : Math.round((won / (won + lost)) * 100);
}

export async function getDashboardMetrics(accountId: string): Promise<DashboardMetrics> {
  await io();
  const rows = await getDb()
    .select({
      outcome: proposals.outcome,
      approval: proposals.approval,
      squareFeet: proposals.squareFeet,
      createdAt: proposals.createdAt,
    })
    .from(proposals)
    .where(eq(proposals.accountId, accountId));

  const now = Date.now();
  const recent = rows.filter((r) => now - r.createdAt.getTime() <= 30 * DAY_MS);
  const prior = rows.filter((r) => {
    const age = now - r.createdAt.getTime();
    return age > 30 * DAY_MS && age <= 60 * DAY_MS;
  });
  const open = (xs: typeof rows) => xs.filter((r) => r.outcome === "open").length;
  const pending = (xs: typeof rows) => xs.filter((r) => r.approval === "pending").length;
  const area = (xs: typeof rows) => xs.reduce((s, r) => s + r.squareFeet, 0);

  return {
    activeProposals: open(rows),
    totalSquareFeet: area(rows),
    pendingApprovals: pending(rows),
    winRate: winRate(rows),
    // Trend = last 30 days vs the 30 days before that (null when there is no earlier data).
    trends: {
      activeProposals: pctChange(open(recent), open(prior)),
      totalSquareFeet: pctChange(area(recent), area(prior)),
      pendingApprovals: pctChange(pending(recent), pending(prior)),
      winRate: pctChange(winRate(recent), winRate(prior)),
    },
  };
}

export async function getProposalDetail(accountId: string, id: string): Promise<ProposalDetail | null> {
  await io();
  const seq = parseSeq(id);
  if (seq === null) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(proposals)
    .where(and(eq(proposals.seq, seq), eq(proposals.accountId, accountId)))
    .limit(1);
  if (!row) return null;
  const items = await db.select().from(bomItems).where(eq(bomItems.proposalSeq, seq)).orderBy(asc(bomItems.position));
  return {
    proposal: toProposal(row),
    document: row.document,
    bom: items.map(({ id: lineId, category, sku, description, unit, quantity, unitCost }) => ({
      id: lineId,
      category,
      sku,
      description,
      unit,
      quantity,
      unitCost,
    })),
  };
}

/* ───────────────────────────────── Usage counts ────────────────────────── */

/** Proposals created by an account, optionally only since `since` (for per-period plan limits). */
export async function countProposals(accountId: string, since?: Date | null): Promise<number> {
  await io();
  const [row] = await getDb()
    .select({ n: count() })
    .from(proposals)
    .where(and(eq(proposals.accountId, accountId), since ? gte(proposals.createdAt, since) : undefined));
  return row?.n ?? 0;
}

/** Blueprint analyses run since `since`; each one costs AI credits, so this feeds the daily cap. */
export async function countUploadsSince(accountId: string, since: Date): Promise<number> {
  await io();
  const [row] = await getDb()
    .select({ n: count() })
    .from(uploads)
    .where(and(eq(uploads.accountId, accountId), gte(uploads.createdAt, since)));
  return row?.n ?? 0;
}

/* ──────────────────────────────── Uploads ──────────────────────────────── */

export async function insertUpload(input: {
  accountId: string;
  userId: string;
  pathname: string;
  fileName: string;
  fileSizeBytes: number;
  analysis: Omit<BlueprintAnalysis, "uploadId">;
}): Promise<BlueprintAnalysis> {
  await io();
  const [row] = await getDb()
    .insert(uploads)
    .values({
      accountId: input.accountId,
      userId: input.userId,
      pathname: input.pathname,
      fileName: input.fileName,
      fileSizeBytes: input.fileSizeBytes,
      analysis: input.analysis,
    })
    .returning({ id: uploads.id });
  return { ...input.analysis, uploadId: row.id };
}

export async function getUpload(accountId: string, uploadId: string): Promise<UploadRow | null> {
  await io();
  const [row] = await getDb()
    .select()
    .from(uploads)
    .where(and(eq(uploads.id, uploadId), eq(uploads.accountId, accountId)))
    .limit(1);
  return row ?? null;
}

/* ──────────────────────────────── Mutations ────────────────────────────── */

/**
 * Create a proposal (and its BOM) from a stored upload. The upload can only be used once:
 * we first "claim" it by setting `proposal_seq`, then write the proposal + BOM in a single
 * atomic batch; if that fails the claim is released.
 */
export async function createProposalFromUpload(input: {
  accountId: string;
  userId: string;
  upload: UploadRow;
  meta: SiteMetadata;
}): Promise<Proposal | null> {
  await io();
  const db = getDb();
  const { upload, meta, accountId, userId } = input;

  const reserved = await db.execute(sql`select nextval(pg_get_serial_sequence('proposals', 'seq')) as seq`);
  const seq = Number((reserved.rows[0] as { seq: string | number }).seq);

  const claimed = await db
    .update(uploads)
    .set({ proposalSeq: seq })
    .where(and(eq(uploads.id, upload.id), eq(uploads.accountId, accountId), isNull(uploads.proposalSeq)))
    .returning({ id: uploads.id });
  if (claimed.length === 0) return null;

  const analysis: BlueprintAnalysis = { ...upload.analysis, uploadId: upload.id };
  const now = new Date();
  const params: SiteParams = {
    id: upload.id,
    address: meta.address,
    buildingType: meta.buildingType,
    material: meta.material,
    jurisdiction: meta.jurisdiction,
    zoningCode: meta.zoningCode,
    clientName: meta.clientName,
    generatedAt: now.toISOString(),
    analysis,
  };
  const bom = generateBom(params);
  const document = generateDocument(params);

  try {
    await db.batch([
      db.insert(proposals).values({
        seq,
        accountId,
        createdBy: userId,
        projectName: meta.address.split(",")[0],
        clientName: meta.clientName,
        address: meta.address,
        buildingType: meta.buildingType,
        material: meta.material,
        jurisdiction: meta.jurisdiction,
        zoningCode: meta.zoningCode,
        status: "drafted",
        squareFeet: analysis.squareFeet,
        fileName: upload.fileName,
        fileSizeBytes: upload.fileSizeBytes,
        pageCount: analysis.pageCount,
        estimatedValue: Math.round(computeBomSummary(bom).total),
        document,
        uploadId: upload.id,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(bomItems).values(
        bom.map((b, position) => ({
          proposalSeq: seq,
          position,
          id: b.id,
          category: b.category,
          sku: b.sku,
          description: b.description,
          unit: b.unit,
          quantity: b.quantity,
          unitCost: b.unitCost,
        })),
      ),
    ]);
  } catch (err) {
    await db.update(uploads).set({ proposalSeq: null }).where(eq(uploads.id, upload.id));
    throw err;
  }

  const [row] = await db.select().from(proposals).where(eq(proposals.seq, seq)).limit(1);
  return toProposal(row);
}

export async function replaceBomItems(accountId: string, id: string, items: BomLineItem[]): Promise<Proposal | null> {
  await io();
  const seq = parseSeq(id);
  if (seq === null) return null;
  const db = getDb();
  const [owned] = await db
    .select({ seq: proposals.seq })
    .from(proposals)
    .where(and(eq(proposals.seq, seq), eq(proposals.accountId, accountId)))
    .limit(1);
  if (!owned) return null;

  const now = new Date();
  const [, , updated] = await db.batch([
    db.delete(bomItems).where(eq(bomItems.proposalSeq, seq)),
    db.insert(bomItems).values(
      items.map((b, position) => ({
        proposalSeq: seq,
        position,
        id: b.id,
        category: b.category,
        sku: b.sku,
        description: b.description,
        unit: b.unit,
        quantity: b.quantity,
        unitCost: b.unitCost,
      })),
    ),
    db
      .update(proposals)
      .set({ estimatedValue: Math.round(computeBomSummary(items).total), updatedAt: now })
      .where(and(eq(proposals.seq, seq), eq(proposals.accountId, accountId)))
      .returning(),
  ]);
  return updated[0] ? toProposal(updated[0]) : null;
}

export async function updateProposalWorkflow(
  accountId: string,
  id: string,
  patch: { approval?: ApprovalState; outcome?: DealOutcome },
): Promise<Proposal | null> {
  await io();
  const seq = parseSeq(id);
  if (seq === null) return null;
  const [row] = await getDb()
    .update(proposals)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(proposals.seq, seq), eq(proposals.accountId, accountId)))
    .returning();
  return row ? toProposal(row) : null;
}