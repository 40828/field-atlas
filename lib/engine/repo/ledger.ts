import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { z } from "zod";
import { edb, schema } from "../db";
import { summarizeLedger } from "../ledger-math";
import { LEDGER_KINDS, type LedgerKind, type LedgerVerification } from "../types";
import type { LedgerRow } from "../schema";

const { ledger } = schema;

export const ledgerEntrySchema = z.object({
  kind: z.enum(LEDGER_KINDS),
  /** Dollars as typed by the user; stored as cents. Always positive — the kind carries the sign. */
  amount: z.number().finite().positive().max(100_000_000).transform((n) => Math.round(n * 100)),
  description: z.string().trim().min(2).max(200),
  /** Transaction/invoice/payment id used for duplicate prevention. */
  reference: z.string().trim().min(1).max(120),
  occurredAt: z.coerce.date().optional(),
  missionId: z.string().uuid().optional(),
  attested: z.boolean().optional(),
});

export interface NewLedgerEntry {
  accountId: string;
  missionId?: string | null;
  kind: LedgerKind;
  amountCents: number;
  description: string;
  source: string;
  sourceRef: string;
  verification?: LedgerVerification;
  occurredAt?: Date;
}

/** Returns the inserted row, or `null` when (account, source, ref) already exists (duplicate). */
export async function addLedgerEntry(e: NewLedgerEntry): Promise<LedgerRow | null> {
  if (!Number.isSafeInteger(e.amountCents) || e.amountCents <= 0) throw new Error("Ledger amounts must be positive integer cents.");
  const db = await edb();
  const [row] = await db
    .insert(ledger)
    .values({
      accountId: e.accountId,
      missionId: e.missionId ?? null,
      kind: e.kind,
      amountCents: e.amountCents,
      description: e.description,
      source: e.source,
      sourceRef: e.sourceRef,
      verification: e.verification ?? "unverified",
      occurredAt: e.occurredAt ?? new Date(),
    })
    .onConflictDoNothing({ target: [ledger.accountId, ledger.source, ledger.sourceRef] })
    .returning();
  return row ?? null;
}

export async function listLedger(accountId: string, opts: { missionId?: string; kinds?: LedgerKind[]; since?: Date; limit?: number } = {}): Promise<LedgerRow[]> {
  const db = await edb();
  const conds = [eq(ledger.accountId, accountId)];
  if (opts.missionId) conds.push(eq(ledger.missionId, opts.missionId));
  if (opts.kinds?.length) conds.push(inArray(ledger.kind, opts.kinds));
  if (opts.since) conds.push(gte(ledger.occurredAt, opts.since));
  return db.select().from(ledger).where(and(...conds)).orderBy(desc(ledger.occurredAt)).limit(opts.limit ?? 500);
}

export async function ledgerSummary(accountId: string, missionId?: string) {
  const rows = await listLedger(accountId, { missionId, limit: 5_000 });
  return summarizeLedger(rows);
}

export async function spentCents(accountId: string): Promise<number> {
  const rows = await listLedger(accountId, { kinds: ["expense"], limit: 5_000 });
  return rows.reduce((a, r) => a + r.amountCents, 0);
}
