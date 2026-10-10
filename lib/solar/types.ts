/**
 * Domain types for the Blueprint-to-Proposal engine.
 * Shared by server actions, the mock data layer and all UI components.
 */

export const PROPOSAL_STATUSES = ["parsing", "ready", "drafted"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const BUILDING_TYPES = ["commercial", "industrial", "residential"] as const;
export type BuildingType = (typeof BUILDING_TYPES)[number];

export const TARGET_MATERIALS = [
  "standing-seam-metal",
  "tpo-membrane",
  "epdm-membrane",
  "modified-bitumen",
  "solar-pv-ballasted",
  "solar-pv-attached",
] as const;
export type TargetMaterial = (typeof TARGET_MATERIALS)[number];

export type ApprovalState = "not-submitted" | "pending" | "approved" | "changes-requested";
export type DealOutcome = "open" | "won" | "lost";

export interface Proposal {
  /** Human-friendly identifier, e.g. `PRP-2041`. */
  id: string;
  projectName: string;
  clientName: string;
  address: string;
  buildingType: BuildingType;
  material: TargetMaterial;
  jurisdiction: string;
  zoningCode: string;
  status: ProposalStatus;
  approval: ApprovalState;
  outcome: DealOutcome;
  squareFeet: number;
  fileName: string;
  fileSizeBytes: number;
  pageCount: number;
  /** Contract value in whole USD, derived from the BOM total. */
  estimatedValue: number;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

/* ─────────────────────────────── Proposal body ─────────────────────────── */

export type CheckStatus = "pass" | "review" | "fail";

export interface DimensionFinding {
  label: string;
  value: string;
  note?: string;
}

export interface ComplianceCheck {
  id: string;
  /** Governing standard, e.g. `ASCE 7-22 §29.4.3`. */
  code: string;
  title: string;
  status: CheckStatus;
  detail: string;
}

export interface ZoningItem {
  id: string;
  requirement: string;
  allowed: string;
  proposed: string;
  status: CheckStatus;
}

export interface ProposalDocument {
  executiveSummary: string[];
  dimensions: DimensionFinding[];
  compliance: ComplianceCheck[];
  zoning: ZoningItem[];
  generatedAt: string;
}

/* ───────────────────────────── Bill of materials ───────────────────────── */

export const BOM_CATEGORIES = [
  "brackets",
  "fasteners",
  "reinforcement",
  "sealants",
  "labor",
] as const;
export type BomCategory = (typeof BOM_CATEGORIES)[number];

export interface BomLineItem {
  id: string;
  category: BomCategory;
  sku: string;
  description: string;
  /** Unit of measure — `ea`, `lf`, `tube`, `hr`… */
  unit: string;
  quantity: number;
  /** USD per unit. For labor lines this is the loaded hourly rate. */
  unitCost: number;
}

export interface BomCategoryTotal {
  category: BomCategory;
  lineCount: number;
  quantity: number;
  subtotal: number;
}

export interface BomSummary {
  byCategory: BomCategoryTotal[];
  materialsSubtotal: number;
  laborSubtotal: number;
  laborHours: number;
  contingencyRate: number;
  contingency: number;
  total: number;
}

export interface ProposalDetail {
  proposal: Proposal;
  document: ProposalDocument;
  bom: BomLineItem[];
}

/* ───────────────────────────────── Dashboard ───────────────────────────── */

export interface DashboardMetrics {
  activeProposals: number;
  totalSquareFeet: number;
  pendingApprovals: number;
  /** 0–100, `won / (won + lost)` */
  winRate: number;
  /** Month-over-month style deltas for the sparkline captions. */
  trends: {
    activeProposals: number | null;
    totalSquareFeet: number | null;
    pendingApprovals: number | null;
    winRate: number | null;
  };
}

/* ───────────────────────────────── Upload flow ─────────────────────────── */

export interface BlueprintAnalysis {
  /** Server-side id of the stored upload + analysis; the only handle the client needs. */
  uploadId: string;
  fileName: string;
  fileSizeBytes: number;
  pageCount: number;
  squareFeet: number;
  roofPlanes: number;
  perimeterFeet: number;
  penetrations: number;
  pitch: string;
  confidence: number; // 0–1
  checksum: string;
  /**
   * Values below are only filled in when the plan set explicitly states them.
   * `null` means "not stated"; the proposal then asks the reviewer to verify
   * instead of guessing.
   */
  designWindMph: number | null;
  groundSnowPsf: number | null;
  deckType: string | null;
  rafterSpacingIn: number | null;
  buildingHeightFt: number | null;
  parapetHeightIn: number | null;
  /** One-sentence reader's note about scale, legibility or assumptions. */
  notes: string;
}

/** Why a server action refused to run, so the UI can offer the right next step. */
export type ActionErrorCode = "limit_reached" | "unauthorized";

/** Discriminated result type returned by every server action. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; code?: ActionErrorCode };
