import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { PlanKey } from "@/lib/billing/plans";
import type {
  ApprovalState,
  BlueprintAnalysis,
  BomCategory,
  BuildingType,
  DealOutcome,
  ProposalDocument,
  ProposalStatus,
  TargetMaterial,
} from "../../types";

/**
 * Tenant model: every row carries `account_id`, the Clerk organization id when the user is
 * working inside an organization, otherwise their own user id. Repository functions always
 * filter on it, so one customer can never read another's blueprints or proposals.
 */

const tz = { withTimezone: true, mode: "date" } as const;

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  plan: text("plan").$type<PlanKey>().notNull().default("free"),
  /** Raw Stripe subscription status (`trialing`, `active`, `past_due`, `canceled`, …). */
  subscriptionStatus: text("subscription_status"),
  billingInterval: text("billing_interval").$type<"monthly" | "annual">(),
  currentPeriodStart: timestamp("current_period_start", tz),
  currentPeriodEnd: timestamp("current_period_end", tz),
  trialEnd: timestamp("trial_end", tz),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
});

/** One row per uploaded blueprint, with the AI analysis stored server-side (never trusted from the client). */
export const uploads = pgTable(
  "uploads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    userId: text("user_id").notNull(),
    pathname: text("pathname").notNull(),
    fileName: text("file_name").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    analysis: jsonb("analysis").$type<Omit<BlueprintAnalysis, "uploadId">>().notNull(),
    /** Set once a proposal is generated from this upload (an upload can only be used once). */
    proposalSeq: integer("proposal_seq"),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  },
  (t) => [index("uploads_account_created_idx").on(t.accountId, t.createdAt)],
);

export const proposals = pgTable(
  "proposals",
  {
    /**
     * Public id is `PRP-${seq}`. "By default" (not "always") so the repository can reserve a
     * value with nextval() and then insert the proposal and its BOM in one atomic batch.
     */
    seq: integer("seq").primaryKey().generatedByDefaultAsIdentity({ startWith: 1001 }),
    accountId: text("account_id").notNull(),
    createdBy: text("created_by").notNull(),
    projectName: text("project_name").notNull(),
    clientName: text("client_name").notNull(),
    address: text("address").notNull(),
    buildingType: text("building_type").$type<BuildingType>().notNull(),
    material: text("material").$type<TargetMaterial>().notNull(),
    jurisdiction: text("jurisdiction").notNull(),
    zoningCode: text("zoning_code").notNull(),
    status: text("status").$type<ProposalStatus>().notNull().default("drafted"),
    approval: text("approval").$type<ApprovalState>().notNull().default("not-submitted"),
    outcome: text("outcome").$type<DealOutcome>().notNull().default("open"),
    squareFeet: integer("square_feet").notNull(),
    fileName: text("file_name").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    pageCount: integer("page_count").notNull(),
    estimatedValue: integer("estimated_value").notNull().default(0),
    document: jsonb("document").$type<ProposalDocument>().notNull(),
    uploadId: uuid("upload_id"),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
  },
  (t) => [index("proposals_account_created_idx").on(t.accountId, t.createdAt)],
);

export const bomItems = pgTable(
  "bom_items",
  {
    proposalSeq: integer("proposal_seq")
      .notNull()
      .references(() => proposals.seq, { onDelete: "cascade" }),
    id: text("id").notNull(),
    position: integer("position").notNull(),
    category: text("category").$type<BomCategory>().notNull(),
    sku: text("sku").notNull(),
    description: text("description").notNull(),
    unit: text("unit").notNull(),
    quantity: doublePrecision("quantity").notNull(),
    unitCost: doublePrecision("unit_cost").notNull(),
  },
  (t) => [primaryKey({ columns: [t.proposalSeq, t.id] })],
);

export type AccountRow = typeof accounts.$inferSelect;
export type UploadRow = typeof uploads.$inferSelect;
export type ProposalRow = typeof proposals.$inferSelect;
