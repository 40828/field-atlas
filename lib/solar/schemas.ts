import { z } from "zod";
import { BOM_CATEGORIES, BUILDING_TYPES, TARGET_MATERIALS } from "./types";
import { UPLOAD_LIMITS } from "./options";

/**
 * Zod schemas are the single source of truth for validation: the wizard runs
 * them on the client for instant feedback, and the server actions re-run them
 * because client checks are never trusted.
 */

/** Strip control characters and collapse whitespace. */
const clean = (s: string) =>
  s
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const cleanString = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} is required` })
    .transform(clean)
    .pipe(
      z
        .string()
        .min(1, `${label} is required`)
        .min(min, `${label} must be at least ${min} characters`)
        .max(max, `${label} must be ${max} characters or fewer`),
    );

/* ───────────────────────────── Blueprint upload ────────────────────────── */

export const blueprintFileSchema = z.object({
  fileName: z
    .string()
    .transform(clean)
    .pipe(
      z
        .string()
        .min(5, "File name is too short")
        .max(180, "File name is too long")
        .regex(/\.pdf$/i, "Only .pdf files are accepted")
        .refine((n) => !/[\\/]/.test(n), "File name must not contain path separators"),
    ),
  fileSizeBytes: z
    .number()
    .int()
    .min(UPLOAD_LIMITS.minBytes, "File looks empty or truncated")
    .max(UPLOAD_LIMITS.maxBytes, `File exceeds the ${UPLOAD_LIMITS.maxBytes / 1024 / 1024} MB limit`),
  mimeType: z.literal(UPLOAD_LIMITS.mime, { error: "File must be a PDF document" }),
  /** First bytes of the file as ASCII; a real PDF always starts with `%PDF-`. */
  magic: z.string().regex(/^%PDF-\d\.\d/, "File content is not a valid PDF"),
});
export type BlueprintFileInput = z.infer<typeof blueprintFileSchema>;

/** What the client sends after a direct-to-Blob upload; the server re-reads the file itself. */
export const blueprintRefSchema = z.object({
  pathname: z
    .string()
    .min(10)
    .max(300)
    .refine((p) => !p.includes("..") && /^blueprints\/[^/]+\/[^/]+\.pdf$/i.test(p), "Invalid upload reference"),
  fileName: blueprintFileSchema.shape.fileName,
  fileSizeBytes: blueprintFileSchema.shape.fileSizeBytes,
});
export type BlueprintRefInput = z.infer<typeof blueprintRefSchema>;

export const createProposalSchema = z.object({
  uploadId: z.uuid("Invalid upload"),
});

export const workflowSchema = z.object({
  proposalId: z.string().regex(/^PRP-\d{4,6}$/, "Invalid proposal id"),
  approval: z.enum(["not-submitted", "pending", "approved", "changes-requested"]).optional(),
  outcome: z.enum(["open", "won", "lost"]).optional(),
});

/* ─────────────────────────────── Site metadata ─────────────────────────── */

export const siteMetadataSchema = z.object({
  clientName: cleanString(2, 80, "Client name"),
  address: cleanString(8, 140, "Property address").refine(
    (v) => /\d/.test(v) && /[A-Za-z]{3,}/.test(v),
    "Include a street number and street name",
  ),
  buildingType: z.enum(BUILDING_TYPES, { error: "Select a building type" }),
  material: z.enum(TARGET_MATERIALS, { error: "Select a target material" }),
  jurisdiction: cleanString(3, 80, "Jurisdiction").refine(
    (v) => /^[A-Za-z0-9][A-Za-z0-9 .,'&()\-/]+$/.test(v),
    "Use letters, numbers and basic punctuation only",
  ),
  zoningCode: cleanString(1, 12, "Zoning code")
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{1,4}[- ]?\d{0,3}[A-Z]?$/, "Use a code like C-2, CS-1 or M-52")),
});
export type SiteMetadataInput = z.input<typeof siteMetadataSchema>;
export type SiteMetadata = z.output<typeof siteMetadataSchema>;

/* ────────────────────────────── BOM line items ─────────────────────────── */

export const bomLineSchema = z.object({
  id: z.string().min(1).max(40),
  category: z.enum(BOM_CATEGORIES),
  sku: cleanString(1, 32, "SKU"),
  description: cleanString(2, 120, "Description"),
  unit: cleanString(1, 8, "Unit"),
  quantity: z.number().finite().min(0, "Quantity cannot be negative").max(1_000_000),
  unitCost: z.number().finite().min(0, "Unit cost cannot be negative").max(1_000_000),
});

export const saveBomSchema = z.object({
  proposalId: z.string().regex(/^PRP-\d{4,6}$/, "Invalid proposal id"),
  items: z.array(bomLineSchema).min(1, "A BOM needs at least one line").max(200),
});

export const proposalIdSchema = z.string().regex(/^PRP-\d{4,6}$/, "Invalid proposal id");

/** Flatten a ZodError into `{ field: firstMessage }` for form display. */
export function flattenIssues(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
