"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { analyzeBlueprint } from "./generate";
import {
  blueprintFileSchema,
  flattenIssues,
  proposalIdSchema,
  saveBomSchema,
  siteMetadataSchema,
  type BlueprintFileInput,
  type SiteMetadataInput,
} from "./schemas";
import { getProposalDetail, insertProposal, markCrmSynced, replaceBomItems } from "./server/db";
import { ActionError, rateLimit, requireSession } from "./server/session";
import type { ActionResult, BlueprintAnalysis, BomLineItem } from "./types";

/**
 * Server actions — the only write path into the mock database.
 *
 * Every action follows the same hardened pipeline:
 *   1. authenticate (`requireSession`)
 *   2. rate-limit per user + action
 *   3. re-validate *all* input with Zod (client checks are never trusted)
 *   4. perform the mutation, then revalidate affected routes
 *   5. return a typed `ActionResult` — never throw to the client
 *
 * Note: only async functions may be exported from a "use server" module.
 */

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function guarded<T>(
  action: string,
  limit: { max: number; windowMs: number },
  run: (ctx: { userId: string }) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const session = await requireSession();
    rateLimit(`${session.userId}:${action}`, limit.max, limit.windowMs);
    return { ok: true, data: await run({ userId: session.userId }) };
  } catch (err) {
    if (err instanceof ActionError) {
      return { ok: false, error: err.message, fieldErrors: err.fieldErrors };
    }
    if (err instanceof ZodError) {
      const fieldErrors = flattenIssues(err);
      return { ok: false, error: Object.values(fieldErrors)[0] ?? "Invalid input", fieldErrors };
    }
    console.error(`[action:${action}]`, err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/** Step 1 — validate the uploaded PDF's metadata and run (simulated) structural analysis. */
export async function analyzeBlueprintAction(
  input: BlueprintFileInput,
): Promise<ActionResult<BlueprintAnalysis>> {
  return guarded("analyze", { max: 20, windowMs: 60_000 }, async () => {
    const file = blueprintFileSchema.parse(input);
    await sleep(2_200); // stand-in for the document-AI round trip
    return analyzeBlueprint(file);
  });
}

/** Step 3 — persist the proposal + generated BOM. Analysis is recomputed server-side. */
export async function createProposalAction(input: {
  file: BlueprintFileInput;
  meta: SiteMetadataInput;
}): Promise<ActionResult<{ id: string }>> {
  return guarded("create", { max: 10, windowMs: 60_000 }, async () => {
    const file = blueprintFileSchema.parse(input.file);
    const meta = siteMetadataSchema.parse(input.meta);
    await sleep(1_400); // drafting + BOM pricing
    const proposal = await insertProposal(analyzeBlueprint(file), meta);
    revalidatePath("/dashboard");
    return { id: proposal.id };
  });
}

/** Persist edited BOM line items and return the authoritative copy. */
export async function saveBomAction(input: {
  proposalId: string;
  items: BomLineItem[];
}): Promise<ActionResult<{ items: BomLineItem[]; updatedAt: string; estimatedValue: number }>> {
  return guarded("save-bom", { max: 60, windowMs: 60_000 }, async () => {
    const parsed = saveBomSchema.parse(input);
    const updated = await replaceBomItems(parsed.proposalId, parsed.items);
    if (!updated) throw new ActionError("Proposal not found");
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/proposals/${parsed.proposalId}`);
    return { items: parsed.items, updatedAt: updated.updatedAt, estimatedValue: updated.estimatedValue };
  });
}

/** Push the proposal to the CRM (simulated HubSpot/Salesforce call). */
export async function syncToCrmAction(
  proposalId: string,
): Promise<ActionResult<{ syncedAt: string; crmRecordId: string }>> {
  return guarded("crm-sync", { max: 15, windowMs: 60_000 }, async () => {
    const id = proposalIdSchema.parse(proposalId);
    const detail = await getProposalDetail(id);
    if (!detail) throw new ActionError("Proposal not found");
    await sleep(1_300);
    const updated = await markCrmSynced(id);
    if (!updated?.crmSyncedAt) throw new ActionError("CRM sync failed");
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/proposals/${id}`);
    return { syncedAt: updated.crmSyncedAt, crmRecordId: `DEAL-${id.slice(4)}-${detail.bom.length}` };
  });
}
