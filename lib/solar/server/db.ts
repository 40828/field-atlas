import { io } from "next/cache";
import { computeBomSummary } from "../bom";
import { analyzeBlueprint, generateBom, generateDocument, type SiteParams } from "../generate";
import type {
  ApprovalState,
  BlueprintAnalysis,
  BomLineItem,
  DashboardMetrics,
  DealOutcome,
  Proposal,
  ProposalDetail,
  ProposalDocument,
  ProposalStatus,
} from "../types";
import type { SiteMetadata } from "../schemas";

/**
 * Mock PostgreSQL layer.
 *
 * Mirrors the shape of a relational schema — `proposals`, `proposal_documents`
 * and `bom_items` tables — behind async repository functions with a little
 * simulated network latency. Swap the bodies for Drizzle/Prisma/pg queries and
 * nothing above this file needs to change.
 *
 * The store is pinned to `globalThis` so it survives dev-server hot reloads.
 *
 * NOTE: server-only. Never import this module from a Client Component.
 */

interface Store {
  proposals: Map<string, Proposal>;
  documents: Map<string, ProposalDocument>;
  bomItems: Map<string, BomLineItem[]>;
  nextSeq: number;
}

interface SeedRow {
  seq: number;
  projectName: string;
  clientName: string;
  address: string;
  buildingType: Proposal["buildingType"];
  material: Proposal["material"];
  jurisdiction: string;
  zoningCode: string;
  status: ProposalStatus;
  approval: ApprovalState;
  outcome: DealOutcome;
  squareFeet: number;
  createdAt: string;
  synced?: boolean;
}

const SEED: SeedRow[] = [
  { seq: 2041, projectName: "Meridian Logistics Hub", clientName: "Meridian Freight Co.", address: "1200 W Buckeye Rd, Phoenix, AZ 85007", buildingType: "industrial", material: "solar-pv-ballasted", jurisdiction: "City of Phoenix, AZ", zoningCode: "A-1", status: "drafted", approval: "pending", outcome: "open", squareFeet: 118_400, createdAt: "2026-10-08T14:22:00Z" },
  { seq: 2040, projectName: "Harbor Point Retail Center", clientName: "Harbor Point Properties", address: "4410 S Congress Ave, Austin, TX 78745", buildingType: "commercial", material: "tpo-membrane", jurisdiction: "City of Austin, TX", zoningCode: "CS-1", status: "ready", approval: "not-submitted", outcome: "open", squareFeet: 64_200, createdAt: "2026-10-07T18:05:00Z" },
  { seq: 2039, projectName: "Cedar Ridge Cold Storage", clientName: "Cedar Ridge Foods", address: "7700 Dean Martin Dr, Las Vegas, NV 89118", buildingType: "industrial", material: "standing-seam-metal", jurisdiction: "Clark County, NV", zoningCode: "IL", status: "drafted", approval: "approved", outcome: "won", squareFeet: 92_750, createdAt: "2026-10-05T09:40:00Z", synced: true },
  { seq: 2038, projectName: "Lakeview Medical Plaza", clientName: "Lakeview Health Partners", address: "880 N Lake Shore Dr, Chicago, IL 60611", buildingType: "commercial", material: "solar-pv-attached", jurisdiction: "City of Chicago, IL", zoningCode: "B3-2", status: "parsing", approval: "not-submitted", outcome: "open", squareFeet: 41_300, createdAt: "2026-10-09T11:12:00Z" },
  { seq: 2037, projectName: "Sunset Terrace Apartments", clientName: "Sunset Terrace HOA", address: "2150 Sunset Cliffs Blvd, San Diego, CA 92107", buildingType: "residential", material: "epdm-membrane", jurisdiction: "San Diego County, CA", zoningCode: "RM-3", status: "drafted", approval: "changes-requested", outcome: "open", squareFeet: 28_900, createdAt: "2026-10-03T16:30:00Z" },
  { seq: 2036, projectName: "Ironworks Distribution Center", clientName: "Ironworks Logistics", address: "3300 E Sunset Rd, Las Vegas, NV 89120", buildingType: "industrial", material: "solar-pv-ballasted", jurisdiction: "Clark County, NV", zoningCode: "IL", status: "drafted", approval: "approved", outcome: "won", squareFeet: 134_000, createdAt: "2026-09-29T13:00:00Z", synced: true },
  { seq: 2035, projectName: "Pioneer Credit Union HQ", clientName: "Pioneer Credit Union", address: "101 W Washington St, Phoenix, AZ 85003", buildingType: "commercial", material: "modified-bitumen", jurisdiction: "City of Phoenix, AZ", zoningCode: "C-2", status: "drafted", approval: "approved", outcome: "lost", squareFeet: 22_400, createdAt: "2026-09-24T10:15:00Z", synced: true },
  { seq: 2034, projectName: "Gulf Coast Fabrication", clientName: "Gulf Coast Fab & Weld", address: "9120 Lawndale St, Houston, TX 77012", buildingType: "industrial", material: "tpo-membrane", jurisdiction: "City of Houston, TX", zoningCode: "IND-2", status: "drafted", approval: "pending", outcome: "open", squareFeet: 76_500, createdAt: "2026-09-22T15:45:00Z" },
  { seq: 2033, projectName: "Birchwood Senior Living", clientName: "Birchwood Communities", address: "512 Birchwood Ln, Austin, TX 78704", buildingType: "residential", material: "solar-pv-attached", jurisdiction: "City of Austin, TX", zoningCode: "MF-4", status: "drafted", approval: "approved", outcome: "won", squareFeet: 36_800, createdAt: "2026-09-17T12:20:00Z", synced: true },
  { seq: 2032, projectName: "Northgate Auto Mall", clientName: "Northgate Automotive Group", address: "4800 N 7th Ave, Phoenix, AZ 85013", buildingType: "commercial", material: "standing-seam-metal", jurisdiction: "City of Phoenix, AZ", zoningCode: "C-3", status: "ready", approval: "not-submitted", outcome: "open", squareFeet: 58_100, createdAt: "2026-09-12T08:50:00Z" },
  { seq: 2031, projectName: "Trailhead Brewing Co.", clientName: "Trailhead Brewing", address: "1900 Larimer St, Denver, CO 80202", buildingType: "commercial", material: "solar-pv-attached", jurisdiction: "City of Denver, CO", zoningCode: "C-MX", status: "drafted", approval: "approved", outcome: "won", squareFeet: 18_700, createdAt: "2026-09-04T17:10:00Z", synced: true },
  { seq: 2030, projectName: "Riverbend Warehouse Park", clientName: "Riverbend Industrial REIT", address: "6025 Rail Yard Rd, Memphis, TN 38118", buildingType: "industrial", material: "epdm-membrane", jurisdiction: "Shelby County, TN", zoningCode: "IH", status: "drafted", approval: "approved", outcome: "lost", squareFeet: 104_300, createdAt: "2026-08-28T14:00:00Z" },
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const LATENCY_MS = 60;

const pad = (n: number) => `PRP-${n}`;

function buildSeed(): Store {
  const store: Store = {
    proposals: new Map(),
    documents: new Map(),
    bomItems: new Map(),
    nextSeq: Math.max(...SEED.map((s) => s.seq)) + 1,
  };

  for (const row of SEED) {
    const id = pad(row.seq);
    const analysis = analyzeBlueprint({
      fileName: `${row.projectName.replace(/[^A-Za-z0-9]+/g, "_")}_RoofPlan.pdf`,
      fileSizeBytes: 3_400_000 + row.seq * 913,
    });
    const params: SiteParams = {
      id,
      address: row.address,
      squareFeet: row.squareFeet,
      buildingType: row.buildingType,
      material: row.material,
      jurisdiction: row.jurisdiction,
      zoningCode: row.zoningCode,
      clientName: row.clientName,
      pageCount: analysis.pageCount,
      generatedAt: row.createdAt,
    };
    const bom = generateBom(params);
    const total = computeBomSummary(bom).total;

    store.proposals.set(id, {
      id,
      projectName: row.projectName,
      clientName: row.clientName,
      address: row.address,
      buildingType: row.buildingType,
      material: row.material,
      jurisdiction: row.jurisdiction,
      zoningCode: row.zoningCode,
      status: row.status,
      approval: row.approval,
      outcome: row.outcome,
      squareFeet: row.squareFeet,
      fileName: analysis.fileName,
      fileSizeBytes: analysis.fileSizeBytes,
      pageCount: analysis.pageCount,
      estimatedValue: Math.round(total),
      crmSyncedAt: row.synced ? row.createdAt : null,
      createdAt: row.createdAt,
      updatedAt: row.createdAt,
    });
    store.bomItems.set(id, bom);
    store.documents.set(id, generateDocument(params));
  }
  return store;
}

const globalForDb = globalThis as typeof globalThis & { __voltlineStore?: Store };

/**
 * Acquire the store. `io()` marks everything after it as request-time work, so
 * Cache Components keeps these reads out of the static shell (data is live).
 */
async function connect(): Promise<Store> {
  await io();
  await sleep(LATENCY_MS);
  return (globalForDb.__voltlineStore ??= buildSeed());
}

/* ───────────────────────────────── Queries ─────────────────────────────── */

export async function listProposals(): Promise<Proposal[]> {
  const db = await connect();
  return [...db.proposals.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const db = await connect();
  const all = [...db.proposals.values()];
  const won = all.filter((p) => p.outcome === "won").length;
  const lost = all.filter((p) => p.outcome === "lost").length;
  return {
    activeProposals: all.filter((p) => p.outcome === "open").length,
    totalSquareFeet: all.reduce((sum, p) => sum + p.squareFeet, 0),
    pendingApprovals: all.filter((p) => p.approval === "pending").length,
    winRate: won + lost === 0 ? 0 : Math.round((won / (won + lost)) * 100),
    // Period-over-period deltas would come from a time-bucketed SQL query.
    trends: { activeProposals: 12.5, totalSquareFeet: 18.2, pendingApprovals: -8.0, winRate: 4.3 },
  };
}

export async function getProposalDetail(id: string): Promise<ProposalDetail | null> {
  const db = await connect();
  const proposal = db.proposals.get(id);
  const document = db.documents.get(id);
  const bom = db.bomItems.get(id);
  if (!proposal || !document || !bom) return null;
  // Return copies so callers can never mutate the "table" in place.
  return {
    proposal: { ...proposal },
    document: structuredClone(document),
    bom: bom.map((b) => ({ ...b })),
  };
}

/* ──────────────────────────────── Mutations ────────────────────────────── */

export async function insertProposal(
  analysis: BlueprintAnalysis,
  meta: SiteMetadata,
): Promise<Proposal> {
  const db = await connect();
  const id = pad(db.nextSeq++);
  const now = new Date().toISOString();

  const params: SiteParams = {
    id,
    address: meta.address,
    squareFeet: analysis.squareFeet,
    buildingType: meta.buildingType,
    material: meta.material,
    jurisdiction: meta.jurisdiction,
    zoningCode: meta.zoningCode,
    clientName: meta.clientName,
    pageCount: analysis.pageCount,
    generatedAt: now,
  };
  const bom = generateBom(params);
  const document = generateDocument(params);

  const proposal: Proposal = {
    id,
    projectName: meta.address.split(",")[0],
    clientName: meta.clientName,
    address: meta.address,
    buildingType: meta.buildingType,
    material: meta.material,
    jurisdiction: meta.jurisdiction,
    zoningCode: meta.zoningCode,
    status: "drafted",
    approval: "not-submitted",
    outcome: "open",
    squareFeet: analysis.squareFeet,
    fileName: analysis.fileName,
    fileSizeBytes: analysis.fileSizeBytes,
    pageCount: analysis.pageCount,
    estimatedValue: Math.round(computeBomSummary(bom).total),
    crmSyncedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  db.proposals.set(id, proposal);
  db.documents.set(id, document);
  db.bomItems.set(id, bom);
  return { ...proposal };
}

export async function replaceBomItems(id: string, items: BomLineItem[]): Promise<Proposal | null> {
  const db = await connect();
  const proposal = db.proposals.get(id);
  if (!proposal) return null;
  db.bomItems.set(id, items.map((i) => ({ ...i })));
  const updated: Proposal = {
    ...proposal,
    estimatedValue: Math.round(computeBomSummary(items).total),
    updatedAt: new Date().toISOString(),
  };
  db.proposals.set(id, updated);
  return { ...updated };
}

export async function markCrmSynced(id: string): Promise<Proposal | null> {
  const db = await connect();
  const proposal = db.proposals.get(id);
  if (!proposal) return null;
  const now = new Date().toISOString();
  const updated: Proposal = { ...proposal, crmSyncedAt: now, updatedAt: now };
  db.proposals.set(id, updated);
  return { ...updated };
}
