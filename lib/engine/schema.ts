import {
  bigint,
  boolean,
  doublePrecision,
  primaryKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  ApprovalStatus,
  EngineEventStatus,
  EnginePlanKey,
  EvidenceBasis,
  LedgerKind,
  LedgerVerification,
  MissionStatus,
  OpportunityData,
  PermissionScope,
  ProjectCheck,
  ProductSpec,
  StrategyKind,
  TaskKind,
  TaskStatus,
} from "./types";

/**
 * Autonomous Money Engine tables. Every row carries `account_id` (Clerk org id, or the user id
 * outside an organization) — the same tenancy key the Voltline tables use. All repository
 * functions in `lib/engine/repo` filter on it, so one customer can never read another's data.
 * Money is stored as integer cents.
 */
const tz = { withTimezone: true, mode: "date" } as const;
const cents = (name: string) => bigint(name, { mode: "number" });

export const engineAccounts = pgTable("engine_accounts", {
  id: text("id").primaryKey(),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  plan: text("plan").$type<EnginePlanKey>().notNull().default("free"),
  subscriptionStatus: text("subscription_status"),
  currentPeriodEnd: timestamp("current_period_end", tz),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  paymentFailedAt: timestamp("payment_failed_at", tz),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
});

/** Processed Stripe event ids → webhook idempotency. */
export const engineStripeEvents = pgTable("engine_stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", tz).notNull().defaultNow(),
});

/** What the user has authorised the autonomous agents to do. Only user-session actions write this. */
export const enginePermissions = pgTable("engine_permissions", {
  accountId: text("account_id").primaryKey(),
  scopes: jsonb("scopes").$type<PermissionScope[]>().notNull().default(["research"]),
  /** Hard spending ceiling across all missions. Agents can never raise it. */
  spendLimitCents: cents("spend_limit_cents").notNull().default(0),
  zeroCapitalMode: boolean("zero_capital_mode").notNull().default(true),
  updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
});

export const missions = pgTable(
  "engine_missions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    createdBy: text("created_by").notNull(),
    title: text("title").notNull(),
    objective: text("objective").notNull(),
    status: text("status").$type<MissionStatus>().notNull().default("draft"),
    targetCents: cents("target_cents").notNull(),
    timeframeDays: integer("timeframe_days"),
    startingCapitalCents: cents("starting_capital_cents").notNull().default(0),
    maxSpendCents: cents("max_spend_cents").notNull().default(0),
    skills: text("skills").notNull().default(""),
    categories: jsonb("categories").$type<string[]>().notNull().default([]),
    riskTolerance: text("risk_tolerance").$type<"low" | "medium" | "high">().notNull().default("medium"),
    constraints: text("constraints").notNull().default(""),
    zeroCapital: boolean("zero_capital").notNull().default(true),
    blockedReason: text("blocked_reason"),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
    startedAt: timestamp("started_at", tz),
    endedAt: timestamp("ended_at", tz),
  },
  (t) => [index("engine_missions_account_idx").on(t.accountId, t.createdAt)],
);

export const tasks = pgTable(
  "engine_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    kind: text("kind").$type<TaskKind>().notNull(),
    title: text("title").notNull(),
    objective: text("objective").notNull(),
    description: text("description").notNull().default(""),
    priority: integer("priority").notNull().default(50),
    dependsOn: jsonb("depends_on").$type<string[]>().notNull().default([]),
    requiredPermissions: jsonb("required_permissions").$type<PermissionScope[]>().notNull().default([]),
    resourceEstimate: jsonb("resource_estimate").$type<{ aiCalls: number; costCents: number; seconds: number }>().notNull(),
    status: text("status").$type<TaskStatus>().notNull().default("pending"),
    input: jsonb("input").$type<Record<string, unknown>>().notNull().default({}),
    output: jsonb("output").$type<Record<string, unknown> | null>(),
    verification: jsonb("verification").$type<{ passed: boolean; checks: string[]; failures: string[] } | null>(),
    error: text("error"),
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),
    timeoutMs: integer("timeout_ms").notNull().default(120_000),
    nextRunAt: timestamp("next_run_at", tz).notNull().defaultNow(),
    leaseExpiresAt: timestamp("lease_expires_at", tz),
    startedAt: timestamp("started_at", tz),
    completedAt: timestamp("completed_at", tz),
    nextAction: text("next_action"),
    /** Duplicate prevention: one task per (mission, key). */
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("engine_tasks_idem_idx").on(t.missionId, t.idempotencyKey),
    index("engine_tasks_runnable_idx").on(t.status, t.nextRunAt),
    index("engine_tasks_mission_idx").on(t.missionId),
  ],
);

export const events = pgTable(
  "engine_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    missionId: uuid("mission_id").references(() => missions.id, { onDelete: "cascade" }),
    taskId: uuid("task_id"),
    type: text("type").notNull(),
    status: text("status").$type<EngineEventStatus>().notNull(),
    title: text("title").notNull(),
    what: text("what").notNull(),
    why: text("why").notNull(),
    expected: text("expected").notNull(),
    evidence: jsonb("evidence").$type<string[]>().notNull().default([]),
    next: text("next").notNull(),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  },
  (t) => [index("engine_events_account_idx").on(t.accountId, t.createdAt), index("engine_events_mission_idx").on(t.missionId, t.createdAt)],
);

/** Real retrieved sources. Rows exist only when a research provider actually returned them. */
export const evidence = pgTable(
  "engine_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    query: text("query").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    snippet: text("snippet").notNull(),
    publishedAt: text("published_at"),
    retrievedAt: timestamp("retrieved_at", tz).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("engine_evidence_url_idx").on(t.missionId, t.url), index("engine_evidence_mission_idx").on(t.missionId)],
);

export const opportunities = pgTable(
  "engine_opportunities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: text("kind").$type<StrategyKind>().notNull(),
    data: jsonb("data").$type<OpportunityData>().notNull(),
    researchedAt: timestamp("researched_at", tz).notNull().defaultNow(),
  },
  (t) => [index("engine_opps_mission_idx").on(t.missionId)],
);

export const strategies = pgTable(
  "engine_strategies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    kind: text("kind").$type<StrategyKind>().notNull(),
    rank: integer("rank").notNull(),
    score: doublePrecision("score").notNull(),
    expectedValueCents: cents("expected_value_cents").notNull(),
    components: jsonb("components").$type<Record<string, number>>().notNull(),
    rationale: text("rationale").notNull(),
    status: text("status").$type<"candidate" | "recommended" | "selected" | "rejected" | "abandoned">().notNull().default("candidate"),
    lessons: text("lessons"),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  },
  (t) => [index("engine_strategies_mission_idx").on(t.missionId, t.rank)],
);

export const experiments = pgTable(
  "engine_experiments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    strategyId: uuid("strategy_id").references(() => strategies.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    hypothesis: text("hypothesis").notNull(),
    successCriteria: text("success_criteria").notNull(),
    plan: jsonb("plan").$type<string[]>().notNull().default([]),
    status: text("status").$type<"proposed" | "running" | "succeeded" | "failed" | "abandoned">().notNull().default("proposed"),
    result: text("result"),
    spec: jsonb("spec").$type<ProductSpec | null>(),
    startedAt: timestamp("started_at", tz),
    completedAt: timestamp("completed_at", tz),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  },
  (t) => [index("engine_experiments_mission_idx").on(t.missionId)],
);

export const projects = pgTable(
  "engine_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    missionId: uuid("mission_id").references(() => missions.id, { onDelete: "set null" }),
    experimentId: uuid("experiment_id").references(() => experiments.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    spec: jsonb("spec").$type<ProductSpec>().notNull(),
    status: text("status")
      .$type<"draft" | "building" | "checks_passed" | "checks_failed" | "preview_ready" | "deployed" | "failed">()
      .notNull()
      .default("draft"),
    /** path → content, capped in size by the factory. */
    files: jsonb("files").$type<Record<string, string>>().notNull().default({}),
    checks: jsonb("checks").$type<ProjectCheck[]>().notNull().default([]),
    sandboxId: text("sandbox_id"),
    previewUrl: text("preview_url"),
    deploymentUrl: text("deployment_url"),
    deploymentStatus: text("deployment_status"),
    deploymentVerifiedAt: timestamp("deployment_verified_at", tz),
    listedInCatalog: boolean("listed_in_catalog").notNull().default(false),
    error: text("error"),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
  },
  (t) => [index("engine_projects_account_idx").on(t.accountId, t.createdAt)],
);

export const approvals = pgTable(
  "engine_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    missionId: uuid("mission_id").references(() => missions.id, { onDelete: "cascade" }),
    taskId: uuid("task_id"),
    scope: text("scope").$type<PermissionScope>().notNull(),
    title: text("title").notNull(),
    detail: text("detail").notNull(),
    costCents: cents("cost_cents").notNull().default(0),
    status: text("status").$type<ApprovalStatus>().notNull().default("pending"),
    decidedBy: text("decided_by"),
    decidedAt: timestamp("decided_at", tz),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  },
  (t) => [index("engine_approvals_account_idx").on(t.accountId, t.status)],
);

export const ledger = pgTable(
  "engine_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    missionId: uuid("mission_id").references(() => missions.id, { onDelete: "set null" }),
    kind: text("kind").$type<LedgerKind>().notNull(),
    amountCents: cents("amount_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    description: text("description").notNull(),
    /** Where the number came from: `manual`, `stripe`, … */
    source: text("source").notNull(),
    /** External transaction id. (account, source, ref) is unique → duplicate prevention. */
    sourceRef: text("source_ref").notNull(),
    verification: text("verification").$type<LedgerVerification>().notNull().default("unverified"),
    occurredAt: timestamp("occurred_at", tz).notNull(),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("engine_ledger_dedupe_idx").on(t.accountId, t.source, t.sourceRef),
    index("engine_ledger_account_idx").on(t.accountId, t.occurredAt),
  ],
);

export const prospects = pgTable(
  "engine_prospects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    missionId: uuid("mission_id").references(() => missions.id, { onDelete: "set null" }),
    company: text("company").notNull(),
    contactName: text("contact_name"),
    role: text("role"),
    /** Only ever entered by the user. The engine does not scrape contact details. */
    email: text("email"),
    website: text("website"),
    notes: text("notes").notNull().default(""),
    source: text("source").notNull().default("manual"),
    stage: text("stage").$type<"new" | "qualified" | "contacted" | "replied" | "meeting" | "won" | "lost">().notNull().default("new"),
    fitScore: integer("fit_score"),
    followUpAt: timestamp("follow_up_at", tz),
    valueCents: cents("value_cents").notNull().default(0),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
  },
  (t) => [index("engine_prospects_account_idx").on(t.accountId, t.createdAt)],
);

export const outreach = pgTable(
  "engine_outreach",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    prospectId: uuid("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: text("status").$type<"draft" | "approved" | "sent_manually" | "replied">().notNull().default("draft"),
    replyClass: text("reply_class").$type<"interested" | "not_now" | "not_interested" | "question" | "unsubscribe" | null>(),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
  },
  (t) => [index("engine_outreach_prospect_idx").on(t.prospectId)],
);

export const marketingAssets = pgTable(
  "engine_marketing_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    missionId: uuid("mission_id").references(() => missions.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"positioning" | "landing_copy" | "social_posts" | "content_calendar">().notNull(),
    title: text("title").notNull(),
    content: jsonb("content").$type<Record<string, unknown>>().notNull(),
    status: text("status").$type<"draft" | "approved" | "published_manually">().notNull().default("draft"),
    /** Entered by the user from the real channel; never generated. */
    metrics: jsonb("metrics").$type<{ impressions?: number; clicks?: number; signups?: number } | null>(),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  },
  (t) => [index("engine_marketing_account_idx").on(t.accountId, t.createdAt)],
);

export const improvements = pgTable(
  "engine_improvements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    observation: text("observation").notNull(),
    hypothesis: text("hypothesis").notNull(),
    successCriterion: text("success_criterion").notNull(),
    proposal: text("proposal").notNull(),
    status: text("status").$type<"proposed" | "approved" | "tested" | "adopted" | "rolled_back" | "rejected">().notNull().default("proposed"),
    baseline: jsonb("baseline").$type<Record<string, unknown> | null>(),
    result: text("result"),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  },
  (t) => [index("engine_improvements_account_idx").on(t.accountId, t.createdAt)],
);

export const favorites = pgTable(
  "engine_favorites",
  {
    accountId: text("account_id").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.accountId, t.projectId] })],
);

export const businesses = pgTable(
  "engine_businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    name: text("name").notNull(),
    summary: text("summary").notNull().default(""),
    askingCents: cents("asking_cents"),
    listed: boolean("listed").notNull().default(false),
    assumptions: text("assumptions").notNull().default(""),
    financialNotes: text("financial_notes").notNull().default(""),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
  },
  (t) => [index("engine_businesses_account_idx").on(t.accountId, t.createdAt)],
);

export const auditLog = pgTable(
  "engine_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    target: text("target"),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  },
  (t) => [index("engine_audit_account_idx").on(t.accountId, t.createdAt)],
);

export type MissionRow = typeof missions.$inferSelect;
export type TaskRow = typeof tasks.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type EvidenceRow = typeof evidence.$inferSelect;
export type OpportunityRow = typeof opportunities.$inferSelect;
export type StrategyRow = typeof strategies.$inferSelect;
export type ExperimentRow = typeof experiments.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type ApprovalRow = typeof approvals.$inferSelect;
export type LedgerRow = typeof ledger.$inferSelect;
export type ProspectRow = typeof prospects.$inferSelect;
export type OutreachRow = typeof outreach.$inferSelect;
export type MarketingAssetRow = typeof marketingAssets.$inferSelect;
export type ImprovementRow = typeof improvements.$inferSelect;
export type EngineAccountRow = typeof engineAccounts.$inferSelect;
export type PermissionsRow = typeof enginePermissions.$inferSelect;
export type FavoriteRow = typeof favorites.$inferSelect;
export type BusinessRow = typeof businesses.$inferSelect;
export type { EvidenceBasis };
