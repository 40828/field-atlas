import { hashString, formatInt, formatNumber } from "./format";
import { MATERIAL_LABELS, BUILDING_TYPE_LABELS } from "./options";
import { roundCents } from "./bom";
import type { BlueprintFileInput } from "./schemas";
import type {
  BlueprintAnalysis,
  BomLineItem,
  BuildingType,
  CheckStatus,
  ComplianceCheck,
  DimensionFinding,
  ProposalDocument,
  TargetMaterial,
  ZoningItem,
} from "./types";

/**
 * Deterministic "AI" stand-ins.
 *
 * A real deployment would call a document-AI / CAD-parsing service here. The
 * mock derives every number from a seeded PRNG so the same blueprint always
 * yields the same analysis, proposal text and BOM (great for demos & tests).
 */

/** mulberry32 — tiny seeded PRNG returning floats in [0, 1). */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (rnd: () => number, min: number, max: number) => min + rnd() * (max - min);

/* ───────────────────────────── Blueprint analysis ──────────────────────── */

export function analyzeBlueprint(file: Pick<BlueprintFileInput, "fileName" | "fileSizeBytes">): BlueprintAnalysis {
  const seed = hashString(`${file.fileName}:${file.fileSizeBytes}`);
  const rnd = seeded(seed);

  const squareFeet = Math.round(between(rnd, 9_000, 138_000) / 10) * 10;
  const roofPlanes = 1 + Math.floor(squareFeet / 22_000) + Math.floor(rnd() * 3);
  const pageCount = Math.max(2, Math.min(64, Math.round(file.fileSizeBytes / (380 * 1024)) + 2));
  const pitches = ["1/4:12", "1/2:12", "1:12", "2:12", "3:12"];

  return {
    fileName: file.fileName,
    fileSizeBytes: file.fileSizeBytes,
    pageCount,
    squareFeet,
    roofPlanes,
    perimeterFeet: Math.round(4 * Math.sqrt(squareFeet) * between(rnd, 1.02, 1.22)),
    penetrations: Math.round(squareFeet / between(rnd, 1_800, 3_000)),
    pitch: pitches[Math.floor(rnd() * pitches.length)],
    confidence: Math.round(between(rnd, 0.91, 0.99) * 100) / 100,
    checksum: seed.toString(16).padStart(8, "0").toUpperCase(),
  };
}

/* ───────────────────────────── Material families ───────────────────────── */

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

/** Lower-case a material label for mid-sentence use, keeping acronyms ("TPO", "PV") intact. */
const inSentence = (label: string) =>
  /^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label;

interface SiteParams {
  id: string;
  address: string;
  squareFeet: number;
  buildingType: BuildingType;
  material: TargetMaterial;
  jurisdiction: string;
  zoningCode: string;
  clientName: string;
  pageCount: number;
  generatedAt: string;
}

/** Shared geometry/loads derived once and used by both the document and BOM. */
function deriveGeometry(p: SiteParams) {
  const rnd = seeded(hashString(`${p.id}:${p.address}`));
  const family = familyOf(p.material);
  const usableRatio = between(rnd, 0.66, 0.8);
  const usableSqFt = Math.round(p.squareFeet * usableRatio);
  const modules = isSolar(family) ? Math.floor((usableSqFt * (family === "solar-ballasted" ? 0.62 : 0.74)) / 27.8) : 0;
  const kwDc = Math.round(modules * 0.55 * 10) / 10; // 550 W modules
  const perimeter = Math.round(4 * Math.sqrt(p.squareFeet) * between(rnd, 1.02, 1.2));
  const penetrations = Math.max(4, Math.round(p.squareFeet / between(rnd, 1_800, 3_000)));
  const rafterSpacingIn = [16, 24, 48][Math.floor(rnd() * 3)];
  const deck = p.buildingType === "residential" ? "7/16\" OSB over 2×10 rafters" : p.buildingType === "industrial" ? "1.5\" Type-B steel deck on bar joists" : "1.5\" steel deck over steel purlins";
  const windMph = Math.round(between(rnd, 105, 140) / 5) * 5;
  const groundSnowPsf = Math.round(between(rnd, 0, 32));
  const addedDeadLoadPsf = family === "solar-ballasted" ? between(rnd, 4.2, 6.1) : isSolar(family) ? between(rnd, 2.6, 3.6) : between(rnd, 0.9, 2.2);
  const reserveCapacityPsf = between(rnd, 3.0, 9.0);
  const loadRatio = addedDeadLoadPsf / reserveCapacityPsf;
  const reinforcedBays = loadRatio > 0.7 ? Math.ceil(p.squareFeet / between(rnd, 2_400, 3_400)) : Math.ceil(p.squareFeet / between(rnd, 9_000, 14_000));
  const heightFt = Math.round(between(rnd, p.buildingType === "residential" ? 24 : 22, p.buildingType === "residential" ? 38 : 52));
  const parapetIn = Math.round(between(rnd, 12, 42));
  return {
    rnd,
    family,
    usableSqFt,
    modules,
    kwDc,
    perimeter,
    penetrations,
    rafterSpacingIn,
    deck,
    windMph,
    groundSnowPsf,
    addedDeadLoadPsf: Math.round(addedDeadLoadPsf * 10) / 10,
    reserveCapacityPsf: Math.round(reserveCapacityPsf * 10) / 10,
    loadRatio,
    reinforcedBays,
    heightFt,
    parapetIn,
  };
}

/* ───────────────────────────────── Bill of materials ───────────────────── */

export function generateBom(p: SiteParams): BomLineItem[] {
  const g = deriveGeometry(p);
  const rnd = seeded(hashString(`bom:${p.id}`));
  const jitter = () => between(rnd, 0.97, 1.04);
  const q = (n: number) => Math.max(1, Math.ceil(n * jitter()));
  const price = (n: number) => roundCents(n * between(rnd, 0.97, 1.05));
  let n = 0;
  const line = (
    category: BomLineItem["category"],
    sku: string,
    description: string,
    unit: string,
    quantity: number,
    unitCost: number,
  ): BomLineItem => ({
    id: `${p.id}-L${String(++n).padStart(2, "0")}`,
    category,
    sku,
    description,
    unit,
    quantity,
    unitCost,
  });

  const items: BomLineItem[] = [];
  const sf = p.squareFeet;

  // Panel brackets ─────────────────────────────────────────────────────────
  switch (g.family) {
    case "solar-attached":
      items.push(
        line("brackets", "BRK-LF-6061", "Anodized aluminum L-foot bracket w/ flashing", "ea", q(g.modules * 2.05), price(14.8)),
        line("brackets", "BRK-MC-35", "Mid / end clamp set, 35 mm frame", "ea", q(g.modules * 2.2), price(3.1)),
      );
      break;
    case "solar-ballasted":
      items.push(
        line("brackets", "BRK-BT-10EW", "Ballasted tilt bracket, 10° east-west", "ea", q(g.modules), price(38.5)),
        line("brackets", "BRK-WD-01", "Wind deflector bracket, galvanized", "ea", q(g.modules * 0.5), price(9.2)),
      );
      break;
    case "metal":
      items.push(
        line("brackets", "BRK-SS-CLIP", "Standing-seam clip bracket, 1.5\" seam", "ea", q(sf / 3.6), price(6.4)),
        line("brackets", "BRK-ER-24", "Eave / ridge support bracket, 24 ga", "ea", q(g.perimeter / 4), price(11.0)),
      );
      break;
    default:
      items.push(
        line("brackets", "BRK-EM-CLT", "Edge-metal cleat bracket, 20 ga", "ea", q(g.perimeter / 1.5), price(5.6)),
        line("brackets", "BRK-CB-ADJ", "Adjustable curb adapter bracket", "ea", q(g.penetrations), price(18.9)),
      );
  }

  // Fasteners ──────────────────────────────────────────────────────────────
  if (isSolar(g.family)) {
    items.push(
      line("fasteners", "FST-SS-1420", "SS 1/4-20 × 1-1/4\" hex bolt w/ lock washer", "ea", q(g.modules * 4.4), price(0.62)),
      line("fasteners", "FST-LAG-516", "5/16\" × 3-1/2\" SS lag screw, structural", "ea", q(g.modules * 2.05 * 2), price(1.45)),
    );
  } else {
    items.push(
      line("fasteners", "FST-SDS-14", "#14 × 2-1/2\" self-drilling roofing screw w/ plate", "ea", q(sf * (g.family === "metal" ? 0.85 : 1.1)), price(0.19)),
      line("fasteners", "FST-TP-3", "3\" insulation plate, galvalume", "ea", q(sf / 2.2), price(0.11)),
    );
  }
  items.push(line("fasteners", "FST-EXP-38", "3/8\" expansion anchor, zinc-plated", "ea", q(g.penetrations * 4), price(1.9)));

  // Structural rafter reinforcements ───────────────────────────────────────
  items.push(
    line("reinforcement", "RFT-LVL-1175", "Sistered LVL rafter, 1-3/4\" × 11-7/8\"", "lf", q(g.reinforcedBays * 22), price(9.35)),
    line("reinforcement", "RFT-CC-8", "Steel C-channel purlin stiffener, 8\" 14 ga", "ea", q(g.reinforcedBays * 1.5), price(46.0)),
    line("reinforcement", "RFT-TP-HD", "Heavy-duty uplift tie plate (HDU-class)", "ea", q(g.reinforcedBays * 2), price(21.5)),
  );

  // Sealants ───────────────────────────────────────────────────────────────
  items.push(
    line("sealants", "SLT-PU-101", "Polyurethane roof sealant, 10.1 oz tube", "tube", q(g.penetrations * 2 + (isSolar(g.family) ? g.modules * 0.35 : sf / 900)), price(8.4)),
    line("sealants", "SLT-FT-4", "Self-adhering flashing tape, 4\" × 100'", "roll", q(g.penetrations / 6 + g.perimeter / 120), price(64.0)),
    line("sealants", "SLT-PR-GAL", "Surface primer, 1 gal", "gal", q(g.penetrations / 18 + 1), price(38.0)),
  );

  // Estimated manual labor hours ───────────────────────────────────────────
  const hrs = (perSqFt: number) => Math.max(8, Math.round((sf * perSqFt) / 2) * 2);
  items.push(
    line("labor", "LAB-LAYOUT", "Survey, layout & safety setup (2-person crew)", "hr", hrs(0.0016), price(74)),
    line("labor", "LAB-STRUCT", "Rafter / purlin reinforcement install", "hr", Math.max(8, g.reinforcedBays * 6), price(88)),
    line("labor", "LAB-INSTALL", isSolar(g.family) ? "Racking & module mounting" : "Primary roofing system install", "hr", hrs(isSolar(g.family) ? 0.0042 : 0.0058), price(82)),
    line("labor", "LAB-SEAL", "Flashing, sealing & weatherproofing QA", "hr", hrs(0.0011), price(78)),
  );

  return items;
}

/* ─────────────────────────────── Proposal document ─────────────────────── */

const pickStatus = (ok: boolean, review: boolean): CheckStatus => (ok ? "pass" : review ? "review" : "fail");

export function generateDocument(p: SiteParams): ProposalDocument {
  const g = deriveGeometry(p);
  const materialLabel = MATERIAL_LABELS[p.material];
  const solar = isSolar(g.family);

  const executiveSummary = [
    `${p.clientName} has engaged us to deliver a ${solar ? "rooftop solar installation" : "roof replacement"} at ${p.address}, a ${formatInt(p.squareFeet)} sq ft ${BUILDING_TYPE_LABELS[p.buildingType].toLowerCase()} facility in ${p.jurisdiction} (zoning ${p.zoningCode}). This proposal is generated directly from the ${p.pageCount}-sheet architectural set and specifies ${inSentence(materialLabel)} as the target system.`,
    solar
      ? `The design places ${formatInt(g.modules)} modules across ${formatInt(g.usableSqFt)} sq ft of usable roof, producing ${formatNumber(g.kwDc)} kW DC. Existing structure carries ${g.addedDeadLoadPsf} psf of added dead load against an estimated ${g.reserveCapacityPsf} psf of reserve capacity, with reinforcement scoped at ${g.reinforcedBays} bays.`
      : `The scope covers full tear-off and installation of ${inSentence(materialLabel)} over ${formatInt(p.squareFeet)} sq ft, with ${g.penetrations} penetrations re-flashed and ${formatInt(g.perimeter)} linear feet of perimeter edge metal replaced. Structural review flags ${g.reinforcedBays} bays for reinforcement before install.`,
    // {{total}} / {{hours}} / {{contingency}} are bound to the live BOM by the document viewer,
    // so the narrative never drifts from the numbers after line items are edited.
    `Estimated project value is {{total}} including a {{contingency}} contingency, based on {{hours}} crew hours. All quantities in the bill of materials are editable and flow through to this figure.`,
  ];

  const dimensions: DimensionFinding[] = [
    { label: "Gross roof area", value: `${formatInt(p.squareFeet)} sq ft`, note: "Sum of all detected roof planes" },
    { label: "Usable area", value: `${formatInt(g.usableSqFt)} sq ft`, note: `${Math.round((g.usableSqFt / p.squareFeet) * 100)}% after setbacks & obstructions` },
    { label: "Perimeter", value: `${formatInt(g.perimeter)} lf` },
    { label: "Roof penetrations", value: `${g.penetrations}`, note: "Vents, drains, RTU curbs" },
    { label: "Structural system", value: g.deck },
    { label: "Framing spacing", value: `${g.rafterSpacingIn}\" o.c.` },
    { label: "Building height", value: `${g.heightFt} ft`, note: `${g.parapetIn}\" parapet` },
    ...(solar
      ? [
          { label: "Module count", value: formatInt(g.modules), note: "550 W bifacial, 2278 × 1134 mm" },
          { label: "System size", value: `${formatNumber(g.kwDc)} kW DC` },
        ]
      : [{ label: "Roof system", value: materialLabel }]),
  ];

  const netUpliftPsf = Math.round(((g.windMph / 100) ** 2) * 16.5 * 10) / 10;
  const attachCapacityPsf = Math.round(netUpliftPsf * between(g.rnd, 1.35, 1.9) * 10) / 10;
  const snowOk = g.groundSnowPsf * 0.7 + g.addedDeadLoadPsf < 40;

  const compliance: ComplianceCheck[] = [
    {
      id: "wind",
      code: "ASCE 7-22 §29.4 / §30.3",
      title: "Wind uplift on roof attachments",
      status: pickStatus(attachCapacityPsf / netUpliftPsf >= 1.5, attachCapacityPsf / netUpliftPsf >= 1.25),
      detail: `Basic wind speed ${g.windMph} mph (Risk Cat. II). Net design uplift ${netUpliftPsf} psf vs. attachment capacity ${attachCapacityPsf} psf (${(attachCapacityPsf / netUpliftPsf).toFixed(2)}× demand).`,
    },
    {
      id: "dead",
      code: "IBC 2021 §1607.13 / ASCE 7 §3.1",
      title: "Existing framing — added dead load",
      status: pickStatus(g.loadRatio <= 0.7, g.loadRatio <= 1),
      detail: `${g.addedDeadLoadPsf} psf added against ${g.reserveCapacityPsf} psf reserve (${Math.round(g.loadRatio * 100)}% utilization). ${g.reinforcedBays} bays receive sistered LVL or C-channel stiffeners.`,
    },
    {
      id: "snow",
      code: "ASCE 7-22 Ch. 7",
      title: "Snow & drift load combinations",
      status: pickStatus(snowOk, true),
      detail: `Ground snow load ${g.groundSnowPsf} psf. Flat-roof snow ${Math.round(g.groundSnowPsf * 0.7)} psf plus system load remains within governing LRFD combinations${snowOk ? "" : "; drift at parapets requires engineer-of-record review"}.`,
    },
    {
      id: "fire",
      code: solar ? "IFC 2021 §1205.2" : "IBC 2021 §1505",
      title: solar ? "Fire access pathways & setbacks" : "Roof assembly fire classification",
      status: "pass",
      detail: solar
        ? "36 in. pathways maintained at ridge and perimeter; array segmentation limits to 150 ft runs without a break."
        : `${materialLabel} assembly is Class A rated over the detected deck type.`,
    },
    {
      id: "listing",
      code: solar ? "UL 2703 / UL 61730" : "FM 4470 / ASTM D6878",
      title: solar ? "Racking & module listing" : "Membrane & fastening listing",
      status: "pass",
      detail: "All specified assemblies carry current listings; documentation attached in the permit packet.",
    },
    {
      id: "ponding",
      code: "IBC 2021 §1611",
      title: "Drainage & ponding stability",
      status: pickStatus(g.rnd() > 0.35, g.rnd() > 0.1),
      detail: "Primary and secondary drainage verified against detected drain count; confirm slope-to-drain at north valley during site survey.",
    },
  ];

  const heightLimit = p.buildingType === "residential" ? 45 : 60;
  const zoning: ZoningItem[] = [
    {
      id: "height",
      requirement: "Max structure height",
      allowed: `${heightLimit} ft`,
      proposed: `${g.heightFt + (solar ? 2 : 0)} ft`,
      status: pickStatus(g.heightFt + 2 <= heightLimit, g.heightFt <= heightLimit),
    },
    {
      id: "setback",
      requirement: "Array / equipment setback from roof edge",
      allowed: "≥ 4 ft",
      proposed: "4.0 ft",
      status: "pass",
    },
    {
      id: "coverage",
      requirement: "Rooftop equipment coverage",
      allowed: "≤ 35%",
      proposed: `${Math.round((g.usableSqFt / p.squareFeet) * (solar ? 0.82 : 0.1) * 100)}%`,
      status: pickStatus(g.rnd() > 0.2, true),
    },
    {
      id: "permit",
      requirement: `${p.jurisdiction} permit pathway`,
      allowed: "Expedited (≤ 15 days)",
      proposed: `Zone ${p.zoningCode} — ${solar ? "solar fast-track" : "re-roof over-the-counter"}`,
      status: "pass",
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
