import { z } from "zod";

/* ───────────────────────────── Enumerations ───────────────────────────── */

export const MISSION_STATUSES = ["draft", "running", "paused", "blocked", "completed", "cancelled", "failed"] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const TASK_KINDS = [
  "research.plan",
  "research.gather",
  "research.synthesize",
  "strategy.rank",
  "experiment.spec",
  "marketing.generate",
  "factory.build",
  "factory.deploy",
] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const TASK_STATUSES = ["pending", "running", "succeeded", "failed", "cancelled", "awaiting_approval", "blocked"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Terminal statuses: nothing further will happen to the task. */
export const TERMINAL_TASK_STATUSES: readonly TaskStatus[] = ["succeeded", "failed", "cancelled"];

/**
 * Honest event states. `simulated` is reserved for explicit dry runs and is never produced by the
 * production engine; `verified` means an independent check (not the model) confirmed the result.
 */
export const EVENT_STATUSES = ["planned", "in_progress", "completed", "verified", "failed", "needs_approval", "simulated"] as const;
export type EngineEventStatus = (typeof EVENT_STATUSES)[number];

export const PERMISSION_SCOPES = ["research", "sandbox", "deploy", "publish", "outreach", "spend"] as const;
export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

export const SCOPE_INFO: Record<PermissionScope, { label: string; description: string; risk: "low" | "medium" | "high" }> = {
  research: { label: "Research", description: "Read public sources (web search, Hacker News) and call the AI model. Read-only.", risk: "low" },
  sandbox: { label: "Code sandbox", description: "Create an isolated Vercel Sandbox VM, write generated code into it and run checks. May consume Vercel usage.", risk: "medium" },
  deploy: { label: "Deploy", description: "Publish a generated application to a public URL through your Vercel account. Always asks per deployment.", risk: "high" },
  publish: { label: "Publish content", description: "Post to public channels. No publishing integration exists yet, so drafts are copied manually.", risk: "high" },
  outreach: { label: "Outreach", description: "Send messages to prospects. No sending integration exists yet; drafts are approved and sent by you.", risk: "high" },
  spend: { label: "Spend money", description: "Incur costs against your spending limit. Every spend still asks for approval.", risk: "high" },
};

export type ApprovalStatus = "pending" | "approved" | "denied" | "expired";

export const LEDGER_KINDS = [
  "revenue_projected",
  "revenue_invoiced",
  "revenue_collected",
  "refund",
  "expense",
  "processing_fee",
  "tax_estimate",
] as const;
export type LedgerKind = (typeof LEDGER_KINDS)[number];

/**
 * `unverified`    – typed in by a person or produced by a forecast.
 * `user_attested` – the owner confirmed it against a real statement (still not independently checked).
 * `provider_verified` – confirmed by a payment provider API call (Stripe) made by the server.
 */
export type LedgerVerification = "unverified" | "user_attested" | "provider_verified";

export const STRATEGY_KINDS = [
  "automation_services",
  "software_product",
  "digital_product",
  "specialized_tool",
  "research_services",
  "education",
  "niche_subscription",
  "improve_existing",
  "other",
] as const;
export type StrategyKind = (typeof STRATEGY_KINDS)[number];

export const STRATEGY_LABELS: Record<StrategyKind, string> = {
  automation_services: "Automation services",
  software_product: "Software product",
  digital_product: "Digital product",
  specialized_tool: "Specialized tool",
  research_services: "Research / data services",
  education: "Educational product",
  niche_subscription: "Niche subscription",
  improve_existing: "Improve existing product",
  other: "Other",
};

export type EvidenceBasis = "observed" | "assumption" | "estimate";

export const ENGINE_PLAN_KEYS = ["free", "pro", "scale"] as const;
export type EnginePlanKey = (typeof ENGINE_PLAN_KEYS)[number];

/* ──────────────────────── Mission input (validated) ────────────────────── */

const optionalCents = z
  .number()
  .finite()
  .min(0)
  .max(1_000_000_000)
  .transform((n) => Math.round(n * 100));

export const DEFAULT_TARGET_CENTS = 100_000_000; // $1,000,000

export const missionInputSchema = z.object({
  objective: z.string().trim().min(5, "Describe what you want in at least a few words.").max(1_000),
  targetAmount: optionalCents.optional(),
  timeframeDays: z.number().int().min(1).max(3_650).optional(),
  startingCapital: optionalCents.optional(),
  maxSpend: optionalCents.optional(),
  skills: z.string().trim().max(1_000).optional(),
  categories: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
  riskTolerance: z.enum(["low", "medium", "high"]).optional(),
  constraints: z.string().trim().max(1_000).optional(),
  zeroCapital: z.boolean().optional(),
});
export type MissionInput = z.input<typeof missionInputSchema>;

/* ─────────────────── Structured output of the research agent ─────────────── */

export const researchPlanSchema = z.object({
  themes: z
    .array(
      z.object({
        theme: z.string().min(3).max(120).describe("A market niche or opportunity area worth investigating."),
        query: z.string().min(3).max(160).describe("A concise web search query that would surface real demand signals (people asking for help, complaints, hiring posts, tools being requested)."),
      }),
    )
    .min(3)
    .max(8),
});
export type ResearchPlan = z.infer<typeof researchPlanSchema>;

const claimSchema = z.object({
  text: z.string().min(3).max(400),
  basis: z.enum(["observed", "assumption", "estimate"]).describe("observed = directly supported by the cited sources; estimate = your numeric/qualitative estimate; assumption = unverified belief."),
  evidenceIds: z.array(z.string()).max(6).describe("Ids of provided sources that support this claim. Empty unless basis is observed."),
});
export type Claim = z.infer<typeof claimSchema>;

export const opportunityCandidateSchema = z.object({
  title: z.string().min(3).max(120),
  kind: z.enum(STRATEGY_KINDS),
  description: z.string().min(10).max(600),
  targetCustomer: z.string().min(3).max(300),
  problem: z.string().min(10).max(500),
  demand: z.array(claimSchema).min(1).max(5),
  competitors: z.array(claimSchema).max(5),
  pricing: z.object({
    model: z.string().max(200),
    lowCents: z.number().min(0).max(100_000_00),
    highCents: z.number().min(0).max(100_000_00),
    basis: z.enum(["observed", "assumption", "estimate"]),
    evidenceIds: z.array(z.string()).max(6),
  }),
  devEffortDays: z.number().min(0).max(365),
  startupCostCents: z.number().min(0).max(100_000_000),
  opCostMonthlyCents: z.number().min(0).max(100_000_000),
  daysToFirstSale: z.number().min(1).max(730),
  channels: z.array(z.string().max(120)).min(1).max(6),
  risks: z.array(z.object({ risk: z.string().max(240), severity: z.enum(["low", "medium", "high"]) })).min(1).max(6),
  validationExperiment: z.object({
    title: z.string().min(3).max(140),
    hypothesis: z.string().min(10).max(400),
    successCriteria: z.string().min(10).max(300),
    steps: z.array(z.string().max(240)).min(2).max(8),
    costCents: z.number().min(0).max(10_000_000),
    days: z.number().min(1).max(60),
  }),
  probability: z.object({
    value: z.number().min(0).max(1).describe("Probability the strategy reaches its base-case revenue."),
    low: z.number().min(0).max(1),
    high: z.number().min(0).max(1),
    rationale: z.string().min(10).max(400),
  }),
  revenue: z.object({
    lowCents: z.number().min(0).max(10_000_000_000),
    baseCents: z.number().min(0).max(10_000_000_000),
    highCents: z.number().min(0).max(10_000_000_000),
    horizonMonths: z.number().int().min(1).max(36),
  }),
  complexity: z.number().int().min(1).max(5),
  competition: z.number().int().min(1).max(5),
  acquisitionDifficulty: z.number().int().min(1).max(5),
  legalRisk: z.enum(["low", "medium", "high"]),
  assumptions: z.array(z.string().max(240)).max(8),
});
export type OpportunityCandidate = z.infer<typeof opportunityCandidateSchema>;

export const synthesisSchema = z.object({
  opportunities: z.array(opportunityCandidateSchema).min(2).max(6),
  limitations: z.string().max(600).describe("What the available sources could NOT tell you."),
});

/** Stored form: the candidate plus fields computed by the server, never by the model. */
export type OpportunityData = OpportunityCandidate & {
  /** 0..1 — share of claims backed by verified source ids. Computed server-side. */
  evidenceQuality: number;
  observedClaims: number;
  totalClaims: number;
  /** Claims the model labelled observed but could not be tied to a retrieved source. */
  downgradedClaims: number;
  limitations: string;
};

/* ───────────────────────────── Product specification ──────────────────── */

export const productSpecSchema = z.object({
  name: z.string().min(2).max(60),
  tagline: z.string().min(5).max(140),
  targetUser: z.string().min(5).max(240),
  problem: z.string().min(10).max(400),
  coreFeatures: z
    .array(z.object({ name: z.string().max(80), description: z.string().max(280), priority: z.enum(["must", "should", "could"]) }))
    .min(2)
    .max(8),
  userFlows: z.array(z.string().max(280)).min(1).max(6),
  dataModel: z.array(z.string().max(200)).max(10),
  techPlan: z.string().min(20).max(900),
  pricing: z.string().max(280),
  acceptanceTests: z.array(z.string().max(240)).min(2).max(10),
  outOfScope: z.array(z.string().max(200)).max(8),
  needsSoftware: z.boolean().describe("False when the validation experiment is better run as a service/manual offer with no code."),
  nonSoftwarePlan: z.string().max(600).describe("When needsSoftware is false, how to validate without building software. Otherwise an empty string."),
});
export type ProductSpec = z.infer<typeof productSpecSchema>;

export const generatedFilesSchema = z.object({
  files: z
    .array(z.object({ path: z.string().min(1).max(120), content: z.string().max(60_000) }))
    .min(3)
    .max(40),
  notes: z.string().max(600),
});

export interface ProjectCheck {
  name: string;
  command: string;
  exitCode: number | null;
  passed: boolean;
  output: string;
  ranAt: string;
  durationMs: number;
}

/* ────────────────────────────── Marketing output ───────────────────────── */

export const marketingSchema = z.object({
  positioning: z.object({
    statement: z.string().max(400),
    audience: z.string().max(240),
    differentiators: z.array(z.string().max(200)).min(2).max(5),
  }),
  landingCopy: z.object({
    headline: z.string().max(120),
    subheadline: z.string().max(240),
    bullets: z.array(z.string().max(200)).min(3).max(6),
    callToAction: z.string().max(60),
  }),
  socialPosts: z
    .array(z.object({ channel: z.string().max(40), text: z.string().max(600) }))
    .min(2)
    .max(6),
  contentCalendar: z.array(z.object({ day: z.number().int().min(1).max(30), activity: z.string().max(200) })).min(3).max(14),
});
export type MarketingOutput = z.infer<typeof marketingSchema>;

export const outreachDraftSchema = z.object({
  subject: z.string().min(3).max(140),
  body: z.string().min(40).max(1_500),
});

/* ─────────────────────────── Action results ────────────────────────────── */

export type EngineActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; code?: string };
