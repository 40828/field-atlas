import { formatInt, formatNumber } from "./format";
import { MATERIAL_LABELS, BUILDING_TYPE_LABELS } from "./options";
import { roundCents } from "./bom";
import type {
  BlueprintAnalysis,
  BomLineItem,
  BuildingType,
  ComplianceCheck,
  DimensionFinding,
  ProposalDocument,
  TargetMaterial,
  ZoningItem,
} from "./types";

/**
 * Proposal drafting.
 *
 * Everything here is a deterministic function of (a) the measurements extracted from the
 * uploaded plan set and (b) the site details the user typed in. There is no randomness and
 * no invented site data: anything the drawings don't state (wind speed, snow load, framing,
 * existing reserve capacity, local zoning limits) is surfaced as "needs verification" for
 * the engineer / estimator rather than guessed.
 *
 * Unit costs and quantity factors are *defaults* meant to be edited in the BOM grid.
 */

/** Material takeoffs include a flat 5% waste/overage allowance. */
const WASTE = 1.05;

/** Roof area occupied by one 550 W module (2278 × 1134 mm ≈ 27.8 sq ft). */
const MODULE_SQFT = 27.8;
const MODULE_KW = 0.55;

type Family = "solar-attached" | "solar-ballasted" | "metal" | "membrane";

const familyOf = (m: TargetMaterial): Family =>
  m === "solar-pv-attached"
    ? "solar-attached"
    : m === "solar-pv-ballasted"
      ? "solar-ballasted"
      : m === "standing-seam-metal"
        ? "metal"
        : "membrane";

const isSolar = (f: Family) => f === "solar-attached" || f === "solar-ballasted";

/** Typical added dead load by system type (psf), used only as a screening figure. */
const TYPICAL_DEAD_LOAD_PSF: Record<Family, number> = {
  "solar-ballasted": 5.0,
  "solar-attached": 3.0,
  metal: 1.5,
  membrane: 1.2,
};

/** Lower-case a material label for mid-sentence use, keeping acronyms ("TPO", "PV") intact. */
const inSentence = (label: string) =>
  /^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label;

interface SiteParams {
  /** Stable seed for line-item ids (the upload id). */
  id: string;
  address: string;
  buildingType: BuildingType;
  material: TargetMaterial;
  jurisdiction: string;
  zoningCode: string;
  clientName: string;
  generatedAt: string;
  analysis: BlueprintAnalysis;
}

/** Shared geometry used by both the document and the BOM. */
function deriveGeometry(p: SiteParams) {
  const a = p.analysis;
  const family = familyOf(p.material);
  const solar = isSolar(family);
  const usableSqFt = solar ? Math.round(a.squareFeet * 0.72) : a.squareFeet;
  const modules = solar
    ? Math.floor((usableSqFt * (family === "solar-ballasted" ? 0.62 : 0.74)) / MODULE_SQFT)
    : 0;
  const kwDc = Math.round(modules * MODULE_KW * 10) / 10;
  // Structural reinforcement is an *allowance* until an engineer sizes it.
  const bayDivisor = family === "solar-ballasted" ? 6_000 : solar ? 9_000 : 14_000;
  return {
    family,
    solar,
    usableSqFt,
    modules,
    kwDc,
    perimeter: Math.round(a.perimeterFeet),
    penetrations: Math.max(0, Math.round(a.penetrations)),
    addedDeadLoadPsf: TYPICAL_DEAD_LOAD_PSF[family],
    reinforcedBays: Math.max(1, Math.ceil(a.squareFeet / bayDivisor)),
  };
}

/* ───────────────────────────────── Bill of materials ───────────────────── */

export function generateBom(p: SiteParams): BomLineItem[] {
  const g = deriveGeometry(p);
  const sf = p.analysis.squareFeet;
  const q = (n: number) => Math.max(1, Math.ceil(n * WASTE));
  let n = 0;
  const line = (
    category: BomLineItem["category"],
    sku: string,
    description: string,
    unit: string,
    quantity: number,
    unitCost: number,
  ): BomLineItem => ({
    id: `${p.id.slice(0, 8)}-L${String(++n).padStart(2, "0")}`,
    category,
    sku,
    description,
    unit,
    quantity,
    unitCost: roundCents(unitCost),
  });

  const items: BomLineItem[] = [];

  // Panel brackets ─────────────────────────────────────────────────────────
  switch (g.family) {
    case "solar-attached":
      items.push(
        line("brackets", "BRK-LF-6061", "Anodized aluminum L-foot bracket w/ flashing", "ea", q(g.modules * 2.05), 14.8),
        line("brackets", "BRK-MC-35", "Mid / end clamp set, 35 mm frame", "ea", q(g.modules * 2.2), 3.1),
      );
      break;
    case "solar-ballasted":
      items.push(
        line("brackets", "BRK-BT-10EW", "Ballasted tilt bracket, 10° east-west", "ea", q(g.modules), 38.5),
        line("brackets", "BRK-WD-01", "Wind deflector bracket, galvanized", "ea", q(g.modules * 0.5), 9.2),
      );
      break;
    case "metal":
      items.push(
        line("brackets", "BRK-SS-CLIP", "Standing-seam clip bracket, 1.5\" seam", "ea", q(sf / 3.6), 6.4),
        line("brackets", "BRK-ER-24", "Eave / ridge support bracket, 24 ga", "ea", q(g.perimeter / 4), 11.0),
      );
      break;
    default:
      items.push(
        line("brackets", "BRK-EM-CLT", "Edge-metal cleat bracket, 20 ga", "ea", q(g.perimeter / 1.5), 5.6),
        line("brackets", "BRK-CB-ADJ", "Adjustable curb adapter bracket", "ea", q(Math.max(g.penetrations, 1)), 18.9),
      );
  }

  // Fasteners ──────────────────────────────────────────────────────────────
  if (g.solar) {
    items.push(
      line("fasteners", "FST-SS-1420", "SS 1/4-20 × 1-1/4\" hex bolt w/ lock washer", "ea", q(g.modules * 4.4), 0.62),
      line("fasteners", "FST-LAG-516", "5/16\" × 3-1/2\" SS lag screw, structural", "ea", q(g.modules * 2.05 * 2), 1.45),
    );
  } else {
    items.push(
      line("fasteners", "FST-SDS-14", "#14 × 2-1/2\" self-drilling roofing screw w/ plate", "ea", q(sf * (g.family === "metal" ? 0.85 : 1.1)), 0.19),
      line("fasteners", "FST-TP-3", "3\" insulation plate, galvalume", "ea", q(sf / 2.2), 0.11),
    );
  }
  items.push(line("fasteners", "FST-EXP-38", "3/8\" expansion anchor, zinc-plated", "ea", q(Math.max(g.penetrations, 1) * 4), 1.9));

  // Structural reinforcement (allowance) ───────────────────────────────────
  items.push(
    line("reinforcement", "RFT-LVL-1175", "Sistered LVL rafter, 1-3/4\" × 11-7/8\" (allowance)", "lf", q(g.reinforcedBays * 22), 9.35),
    line("reinforcement", "RFT-CC-8", "Steel C-channel purlin stiffener, 8\" 14 ga (allowance)", "ea", q(g.reinforcedBays * 1.5), 46.0),
    line("reinforcement", "RFT-TP-HD", "Heavy-duty uplift tie plate (HDU-class)", "ea", q(g.reinforcedBays * 2), 21.5),
  );

  // Sealants ───────────────────────────────────────────────────────────────
  items.push(
    line("sealants", "SLT-PU-101", "Polyurethane roof sealant, 10.1 oz tube", "tube", q(g.penetrations * 2 + (g.solar ? g.modules * 0.35 : sf / 900)), 8.4),
    line("sealants", "SLT-FT-4", "Self-adhering flashing tape, 4\" × 100'", "roll", q(g.penetrations / 6 + g.perimeter / 120), 64.0),
    line("sealants", "SLT-PR-GAL", "Surface primer, 1 gal", "gal", q(g.penetrations / 18 + 1), 38.0),
  );

  // Estimated manual labor hours ───────────────────────────────────────────
  const hrs = (perSqFt: number) => Math.max(8, Math.round((sf * perSqFt) / 2) * 2);
  items.push(
    line("labor", "LAB-LAYOUT", "Survey, layout & safety setup (2-person crew)", "hr", hrs(0.0016), 74),
    line("labor", "LAB-STRUCT", "Rafter / purlin reinforcement install", "hr", Math.max(8, g.reinforcedBays * 6), 88),
    line("labor", "LAB-INSTALL", g.solar ? "Racking & module mounting" : "Primary roofing system install", "hr", hrs(g.solar ? 0.0042 : 0.0058), 82),
    line("labor", "LAB-SEAL", "Flashing, sealing & weatherproofing QA", "hr", hrs(0.0011), 78),
  );

  return items;
}

/* ─────────────────────────────── Proposal document ─────────────────────── */

const NOT_STATED = "Not stated in plan set";

export function generateDocument(p: SiteParams): ProposalDocument {
  const g = deriveGeometry(p);
  const a = p.analysis;
  const materialLabel = MATERIAL_LABELS[p.material];

  const executiveSummary = [
    `${p.clientName} has engaged us to deliver a ${g.solar ? "rooftop solar installation" : "roof replacement"} at ${p.address}, a ${formatInt(a.squareFeet)} sq ft ${BUILDING_TYPE_LABELS[p.buildingType].toLowerCase()} facility in ${p.jurisdiction} (zoning ${p.zoningCode}). This proposal was drafted from the ${a.pageCount}-page plan set provided and specifies ${inSentence(materialLabel)} as the target system.`,
    g.solar
      ? `A preliminary layout places about ${formatInt(g.modules)} modules across ${formatInt(g.usableSqFt)} sq ft of usable roof (roughly ${formatNumber(g.kwDc)} kW DC). Added dead load for this system type is typically around ${g.addedDeadLoadPsf} psf; existing framing capacity has not been verified, so reinforcement is carried as an allowance of ${g.reinforcedBays} bays pending structural review.`
      : `The scope covers full tear-off and installation of ${inSentence(materialLabel)} over ${formatInt(a.squareFeet)} sq ft, with ${g.penetrations} detected penetrations re-flashed and ${formatInt(g.perimeter)} linear feet of perimeter edge metal replaced. Structural reinforcement is carried as an allowance of ${g.reinforcedBays} bays pending structural review.`,
    // {{total}} / {{hours}} / {{contingency}} are bound to the live BOM by the document viewer,
    // so the narrative never drifts from the numbers after line items are edited.
    `Estimated project value is {{total}} including a {{contingency}} contingency, based on {{hours}} crew hours. Quantities are measured from the plan set with a 5% waste allowance; unit costs are default assumptions to be replaced with your supplier pricing.`,
  ];

  const dimensions: DimensionFinding[] = [
    { label: "Gross roof area", value: `${formatInt(a.squareFeet)} sq ft`, note: `Across ${a.roofPlanes} detected roof plane${a.roofPlanes === 1 ? "" : "s"}` },
    ...(g.solar
      ? [{ label: "Usable array area", value: `${formatInt(g.usableSqFt)} sq ft`, note: "72% of gross after setbacks & obstructions (assumed)" }]
      : []),
    { label: "Perimeter", value: `${formatInt(g.perimeter)} lf` },
    { label: "Roof penetrations", value: `${g.penetrations}`, note: "Vents, drains, RTU curbs as detected" },
    { label: "Roof pitch", value: a.pitch || NOT_STATED },
    { label: "Structural system", value: a.deckType ?? NOT_STATED },
    { label: "Framing spacing", value: a.rafterSpacingIn ? `${a.rafterSpacingIn}" o.c.` : NOT_STATED },
    { label: "Building height", value: a.buildingHeightFt ? `${a.buildingHeightFt} ft` : NOT_STATED, note: a.parapetHeightIn ? `${a.parapetHeightIn}" parapet` : undefined },
    ...(g.solar
      ? [
          { label: "Module count (estimate)", value: formatInt(g.modules), note: "550 W bifacial, 2278 × 1134 mm" },
          { label: "System size (estimate)", value: `${formatNumber(g.kwDc)} kW DC` },
        ]
      : [{ label: "Roof system", value: materialLabel }]),
    ...(a.notes ? [{ label: "Reader's note", value: a.notes }] : []),
  ];

  // Screening checklist. Nothing here claims a pass: each item states what was found in the
  // drawings and what an engineer must still confirm.
  const compliance: ComplianceCheck[] = [
    {
      id: "wind",
      code: "ASCE 7-22 Ch. 26–30",
      title: "Wind uplift on roof attachments",
      status: "review",
      detail: `Design wind speed: ${a.designWindMph ? `${a.designWindMph} mph (per plan set)` : NOT_STATED}. Attachment or ballast design must be checked against site wind speed, exposure category and risk category by the engineer of record.`,
    },
    {
      id: "dead",
      code: "IBC 2021 §1607 / ASCE 7 Ch. 3",
      title: "Existing framing: added dead load",
      status: "review",
      detail: `Typical added load for this system is about ${g.addedDeadLoadPsf} psf. Existing framing reserve capacity is ${a.deckType || a.rafterSpacingIn ? "not stated with a load rating" : NOT_STATED}; reinforcement is carried as a ${g.reinforcedBays}-bay allowance until verified.`,
    },
    {
      id: "snow",
      code: "ASCE 7-22 Ch. 7",
      title: "Snow & drift load combinations",
      status: "review",
      detail: `Ground snow load: ${a.groundSnowPsf !== null ? `${a.groundSnowPsf} psf (per plan set)` : NOT_STATED}. Confirm governing load combinations${a.parapetHeightIn ? ` and drift at the ${a.parapetHeightIn}" parapets` : ""}.`,
    },
    {
      id: "fire",
      code: g.solar ? "IFC 2021 §1205" : "IBC 2021 §1505",
      title: g.solar ? "Fire access pathways & setbacks" : "Roof assembly fire classification",
      status: "review",
      detail: g.solar
        ? "Confirm pathway widths, ridge and perimeter setbacks, and array segmentation with the local fire authority."
        : `Confirm the ${materialLabel} assembly carries the fire classification required for this occupancy and deck type.`,
    },
    {
      id: "listing",
      code: g.solar ? "UL 2703 / UL 61730" : "FM 4470 / ASTM D6878",
      title: g.solar ? "Racking & module listing" : "Membrane & fastening listing",
      status: "review",
      detail: "Product listings depend on the manufacturers and SKUs you select. Attach current listings to the permit packet.",
    },
    {
      id: "ponding",
      code: "IBC 2021 §1611",
      title: "Drainage & ponding stability",
      status: "review",
      detail: `${g.penetrations} penetrations were detected${g.penetrations ? "" : "; no drains were identified"}. Verify slope-to-drain and secondary drainage during the site survey.`,
    },
  ];

  const zoning: ZoningItem[] = [
    {
      id: "height",
      requirement: "Max structure height",
      allowed: `Verify with ${p.jurisdiction}`,
      proposed: a.buildingHeightFt ? `${a.buildingHeightFt + (g.solar ? 2 : 0)} ft${g.solar ? " (with array)" : ""}` : NOT_STATED,
      status: "review",
    },
    {
      id: "setback",
      requirement: "Equipment setback from roof edge",
      allowed: `Verify with ${p.jurisdiction}`,
      proposed: "Set during final layout",
      status: "review",
    },
    {
      id: "coverage",
      requirement: "Rooftop equipment coverage",
      allowed: `Verify with ${p.jurisdiction}`,
      proposed: g.solar ? `${Math.round((g.modules * MODULE_SQFT) / a.squareFeet * 100)}% (estimate)` : "Minimal",
      status: "review",
    },
    {
      id: "permit",
      requirement: `${p.jurisdiction} permit pathway`,
      allowed: `Zone ${p.zoningCode}: confirm with the building department`,
      proposed: g.solar ? "Solar permit application" : "Re-roof permit application",
      status: "review",
    },
  ];

  return {
    executiveSummary,
    dimensions,
    compliance,
    zoning,
    generatedAt: p.generatedAt,
  };
}

export type { SiteParams };
