/**
 * Plan catalogue shared by the marketing pricing table, the billing page and the
 * server-side entitlement checks. Pure data, safe to import from client components.
 *
 * Prices here are display values. The Stripe Prices (created by
 * `scripts/stripe-setup.ts`) are looked up by `lookupKey`, so changing a price means
 * updating it here, re-running the setup script, and archiving the old Stripe price.
 */

export const PLAN_KEYS = ["free", "starter", "team"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const PAID_PLAN_KEYS = ["starter", "team"] as const;
export type PaidPlanKey = (typeof PAID_PLAN_KEYS)[number];

export const BILLING_INTERVALS = ["monthly", "annual"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const ANNUAL_DISCOUNT = 0.2;
export const TRIAL_DAYS = 14;

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  /** Proposals allowed per window; `null` = unlimited. */
  proposalLimit: number | null;
  /** `lifetime` for the free allowance, otherwise the current billing period. */
  window: "lifetime" | "period";
  /** Blueprint analyses (each one costs AI credits) allowed per rolling 24 h. */
  analysesPerDay: number;
  /** Monthly list price in USD; `null` for the free allowance. */
  monthlyPrice: number | null;
}

export const PLANS: Record<PlanKey, PlanDefinition> = {
  free: { key: "free", name: "Free trial", proposalLimit: 2, window: "lifetime", analysesPerDay: 5, monthlyPrice: null },
  starter: { key: "starter", name: "Starter", proposalLimit: 25, window: "period", analysesPerDay: 50, monthlyPrice: 199 },
  team: { key: "team", name: "Team", proposalLimit: null, window: "period", analysesPerDay: 200, monthlyPrice: 599 },
};

export const isPlanKey = (v: unknown): v is PlanKey => PLAN_KEYS.includes(v as PlanKey);
export const isPaidPlanKey = (v: unknown): v is PaidPlanKey => PAID_PLAN_KEYS.includes(v as PaidPlanKey);
export const isBillingInterval = (v: unknown): v is BillingInterval => BILLING_INTERVALS.includes(v as BillingInterval);

/** Effective per-month price shown to the customer for an interval. */
export function displayMonthlyPrice(plan: PaidPlanKey, interval: BillingInterval): number {
  const base = PLANS[plan].monthlyPrice ?? 0;
  return Math.round(interval === "annual" ? base * (1 - ANNUAL_DISCOUNT) : base);
}

/** Amount actually charged per billing cycle, in whole USD. */
export function chargePerCycle(plan: PaidPlanKey, interval: BillingInterval): number {
  const base = PLANS[plan].monthlyPrice ?? 0;
  return interval === "annual" ? Math.round(base * 12 * (1 - ANNUAL_DISCOUNT)) : base;
}

/** Stable Stripe Price lookup key, e.g. `voltline_starter_annual`. */
export const lookupKey = (plan: PaidPlanKey, interval: BillingInterval) => `voltline_${plan}_${interval}`;

/** Inverse of {@link lookupKey}; returns `null` for keys that aren't ours. */
export function parseLookupKey(key: string | null | undefined): { plan: PaidPlanKey; interval: BillingInterval } | null {
  const m = /^voltline_(starter|team)_(monthly|annual)$/.exec(key ?? "");
  return m ? { plan: m[1] as PaidPlanKey, interval: m[2] as BillingInterval } : null;
}

/** Subscription states that keep paid features switched on. `past_due` gets Stripe's retry grace period. */
export const ACTIVE_SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due"] as const;
