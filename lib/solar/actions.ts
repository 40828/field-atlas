"use server";

import { revalidatePath } from "next/cache";
import { get } from "@vercel/blob";
import { assertCanAnalyze, assertCanCreateProposal, getEntitlement } from "@/lib/billing/entitlements";
import {
  blueprintRefSchema,
  createProposalSchema,
  saveBomSchema,
  siteMetadataSchema,
  workflowSchema,
  type BlueprintRefInput,
  type SiteMetadataInput,
} from "./schemas";
import { UPLOAD_LIMITS } from "./options";
import { extractBlueprint } from "./server/analyze";
import { createProposalFromUpload, getUpload, insertUpload, replaceBomItems, updateProposalWorkflow } from "./server/db";
import { guarded } from "./server/guarded";
import { ActionError } from "./server/session";
import type { ActionResult, ApprovalState, BlueprintAnalysis, BomLineItem, DealOutcome } from "./types";

/**
 * Server actions: the only write path into the database. Each runs through `guarded`
 * (auth → rate limit → Zod re-validation → mutate → typed result) and is scoped to the
 * caller's `accountId`.
 *
 * Note: only async functions may be exported from a "use server" module.
 */

/**
 * Step 1: read the uploaded PDF from private storage, measure it with the vision model and
 * store the result server-side. The client only ever receives the resulting `uploadId`.
 */
export async function analyzeBlueprintAction(input: BlueprintRefInput): Promise<ActionResult<BlueprintAnalysis>> {
  return guarded("analyze", { max: 10, windowMs: 60_000 }, async ({ accountId, userId }) => {
    const ref = blueprintRefSchema.parse(input);
    if (!ref.pathname.startsWith(`blueprints/${accountId}/`)) {
      throw new ActionError("That upload doesn't belong to your account.");
    }
    assertCanAnalyze(await getEntitlement(accountId));

    const blob = await get(ref.pathname, { access: "private" });
    if (!blob || blob.statusCode !== 200) throw new ActionError("We couldn't find that upload. Please upload it again.");
    if (blob.blob.size > UPLOAD_LIMITS.maxBytes || blob.blob.size < UPLOAD_LIMITS.minBytes) {
      throw new ActionError("That file's size isn't supported.");
    }
    const pdf = Buffer.from(await new Response(blob.stream).arrayBuffer());
    if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") {
      throw new ActionError("File content is not a valid PDF.");
    }

    const extracted = await extractBlueprint(pdf, ref.fileName);
    return insertUpload({
      accountId,
      userId,
      pathname: ref.pathname,
      fileName: ref.fileName,
      fileSizeBytes: pdf.byteLength,
      analysis: { ...extracted, fileName: ref.fileName, fileSizeBytes: pdf.byteLength },
    });
  });
}

/** Step 3: generate the proposal + BOM from a stored analysis and the confirmed site details. */
export async function createProposalAction(input: {
  uploadId: string;
  meta: SiteMetadataInput;
}): Promise<ActionResult<{ id: string }>> {
  return guarded("create", { max: 10, windowMs: 60_000 }, async ({ accountId, userId }) => {
    const { uploadId } = createProposalSchema.parse({ uploadId: input.uploadId });
    const meta = siteMetadataSchema.parse(input.meta);
    assertCanCreateProposal(await getEntitlement(accountId));

    const upload = await getUpload(accountId, uploadId);
    if (!upload) throw new ActionError("That upload wasn't found. Please upload the plan again.");
    const proposal = await createProposalFromUpload({ accountId, userId, upload, meta });
    if (!proposal) throw new ActionError("A proposal was already created from that upload.");

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/billing");
    return { id: proposal.id };
  });
}

/** Persist edited BOM line items and return the authoritative copy. */
export async function saveBomAction(input: {
  proposalId: string;
  items: BomLineItem[];
}): Promise<ActionResult<{ items: BomLineItem[]; updatedAt: string; estimatedValue: number }>> {
  return guarded("save-bom", { max: 60, windowMs: 60_000 }, async ({ accountId }) => {
    const parsed = saveBomSchema.parse(input);
    const updated = await replaceBomItems(accountId, parsed.proposalId, parsed.items);
    if (!updated) throw new ActionError("Proposal not found");
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/proposals/${parsed.proposalId}`);
    return { items: parsed.items, updatedAt: updated.updatedAt, estimatedValue: updated.estimatedValue };
  });
}

/** Track where a proposal stands (approval + deal outcome); feeds the dashboard metrics. */
export async function updateWorkflowAction(input: {
  proposalId: string;
  approval?: ApprovalState;
  outcome?: DealOutcome;
}): Promise<ActionResult<{ approval: ApprovalState; outcome: DealOutcome }>> {
  return guarded("workflow", { max: 60, windowMs: 60_000 }, async ({ accountId }) => {
    const { proposalId, ...patch } = workflowSchema.parse(input);
    const updated = await updateProposalWorkflow(accountId, proposalId, patch);
    if (!updated) throw new ActionError("Proposal not found");
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/proposals/${proposalId}`);
    return { approval: updated.approval, outcome: updated.outcome };
  });
}
