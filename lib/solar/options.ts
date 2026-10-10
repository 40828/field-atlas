import {
  Building2,
  Factory,
  Home,
  type LucideIcon,
} from "lucide-react";
import type {
  ApprovalState,
  BomCategory,
  BuildingType,
  ProposalStatus,
  TargetMaterial,
} from "./types";

export const BUILDING_TYPE_OPTIONS: {
  value: BuildingType;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  { value: "commercial", label: "Commercial", hint: "Offices, retail, warehouses", icon: Building2 },
  { value: "industrial", label: "Industrial", hint: "Plants, distribution, cold storage", icon: Factory },
  { value: "residential", label: "Residential", hint: "Multi-family & large single-family", icon: Home },
];

export const MATERIAL_LABELS: Record<TargetMaterial, string> = {
  "standing-seam-metal": "Standing-seam metal (24 ga)",
  "tpo-membrane": "TPO membrane (60 mil)",
  "epdm-membrane": "EPDM membrane (90 mil)",
  "modified-bitumen": "Modified bitumen (SBS)",
  "solar-pv-ballasted": "Solar PV — ballasted racking",
  "solar-pv-attached": "Solar PV — attached racking",
};

export const MATERIAL_OPTIONS = (Object.keys(MATERIAL_LABELS) as TargetMaterial[]).map(
  (value) => ({ value, label: MATERIAL_LABELS[value] }),
);

export const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  commercial: "Commercial",
  industrial: "Industrial",
  residential: "Residential",
};

export const STATUS_LABELS: Record<ProposalStatus, string> = {
  parsing: "Parsing",
  ready: "Ready",
  drafted: "Drafted",
};

export const APPROVAL_LABELS: Record<ApprovalState, string> = {
  "not-submitted": "Not submitted",
  pending: "Pending",
  approved: "Approved",
  "changes-requested": "Changes requested",
};

export const BOM_CATEGORY_LABELS: Record<BomCategory, string> = {
  brackets: "Panel Brackets",
  fasteners: "Fasteners",
  reinforcement: "Structural Rafter Reinforcements",
  sealants: "Sealants",
  labor: "Estimated Manual Labor Hours",
};

export const JURISDICTION_SUGGESTIONS: { jurisdiction: string; zoningCode: string }[] = [
  { jurisdiction: "City of Phoenix, AZ", zoningCode: "A-1" },
  { jurisdiction: "City of Austin, TX", zoningCode: "CS-1" },
  { jurisdiction: "Clark County, NV", zoningCode: "IL" },
  { jurisdiction: "San Diego County, CA", zoningCode: "M-52" },
];

/** Upload constraints, enforced on the client *and* re-checked in the server action. */
export const UPLOAD_LIMITS = {
  maxBytes: 50 * 1024 * 1024,
  minBytes: 1024,
  mime: "application/pdf",
} as const;
