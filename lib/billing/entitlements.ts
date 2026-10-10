import "server-only";
import { ActionError } from "@/lib/solar/server/session";
import { countProposals, countUploadsSince } from "@/lib/solar/server/db";
import { getAccount } from "./accounts";
import { ACTIVE_SUBSCRIPTION_STATUSES, PLANS, type PlanKey } from "./plans";

export interface Entitlement {
  plan: PlanKey;
  planName: string;
  status: string | null;
  proposalsUsed: number;
  /** `null` = unlimited. */
  proposalLimit: number | null;
  proposalsRemaining: number | null;
  /** Start of the window `proposalsUsed` counts over; `null` for the lifetime free allowance. */
  windowStart: Date | null;
  analysesToday: number;
  analysesPerDay: number;
  periodEnd: Date | null;
  trialEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
}

export async function getEntitlement(accountId: string): Promise<Entitlement> {
  const account = await getAccount(accountId);
  const live =
    account && account.plan !== "free" && (ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(account.subscriptionStatus ?? "");
  const plan: PlanKey = live ? account.plan : "free";
  const def = PLANS[plan];

  // Paid plans meter per billing period; the free allowance is lifetime.
  const windowStart = def.window === "period" ? (account?.currentPeriodStart ?? null) : null;
  const dayAgo = new Date(Date.now() - 86_400_000);
  const [proposalsUsed, analysesToday] = await Promise.all([
    countProposals(accountId, windowStart),
    countUploadsSince(accountId, dayAgo),
  ]);

  return {
    plan,
    planName: def.name,
    status: account?.subscriptionStatus ?? null,
    proposalsUsed,
    proposalLimit: def.proposalLimit,
    proposalsRemaining: def.proposalLimit === null ? null : Math.max(0, def.proposalLimit - proposalsUsed),
    windowStart,
    analysesToday,
    analysesPerDay: def.analysesPerDay,
    periodEnd: account?.currentPeriodEnd ?? null,
    trialEnd: account?.trialEnd ?? null,
    cancelAtPeriodEnd: account?.cancelAtPeriodEnd ?? false,
    hasStripeCustomer: Boolean(account?.stripeCustomerId),
  };
}

/** Throws a `limit_reached` ActionError when the account has no proposals left on its plan. */
export function assertCanCreateProposal(e: Entitlement): void {
  if (e.proposalsRemaining !== null && e.proposalsRemaining <= 0) {
    throw new ActionError(
      e.plan === "free"
        ? "You've used your free proposals. Start a plan to keep generating."
        : `You've reached the ${e.proposalLimit} proposals included in your ${e.planName} plan this period. Upgrade to continue.`,
      undefined,
      "limit_reached",
    );
  }
}

/** AI analyses cost money, so they are capped per rolling day regardless of plan. */
export function assertCanAnalyze(e: Entitlement): void {
  assertCanCreateProposal(e);
  if (e.analysesToday >= e.analysesPerDay) {
    throw new ActionError(
      `Daily analysis limit reached (${e.analysesPerDay}/day on ${e.planName}). Try again tomorrow or contact us for a higher limit.`,
    );
  }
}
