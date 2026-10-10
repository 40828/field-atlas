import "server-only";
import { eq } from "drizzle-orm";
import { edb, schema } from "./db";
import { countActiveMissions, countAiTasksSince } from "./repo/core";
import { ENGINE_PLAN_KEYS, type EnginePlanKey } from "./types";
import { EngineActionError } from "./session";

export const ENGINE_PLANS: Record<
  EnginePlanKey,
  { key: EnginePlanKey; name: string; monthlyPrice: number | null; activeMissions: number; aiTasksPerDay: number }
> = {
  free: { key: "free", name: "Explorer", monthlyPrice: null, activeMissions: 2, aiTasksPerDay: 20 },
  pro: { key: "pro", name: "Operator", monthlyPrice: 49, activeMissions: 8, aiTasksPerDay: 150 },
  scale: { key: "scale", name: "Studio", monthlyPrice: 199, activeMissions: 25, aiTasksPerDay: 600 },
};

export const ENGINE_PAID_PLANS = ["pro", "scale"] as const;
export type EnginePaidPlan = (typeof ENGINE_PAID_PLANS)[number];

export const engineLookupKey = (plan: EnginePaidPlan, interval: "monthly" | "annual") => `ame_${plan}_${interval}`;

export function parseEngineLookupKey(key: string | null | undefined): { plan: EnginePaidPlan; interval: "monthly" | "annual" } | null {
  const m = /^ame_(pro|scale)_(monthly|annual)$/.exec(key ?? "");
  return m ? { plan: m[1] as EnginePaidPlan, interval: m[2] as "monthly" | "annual" } : null;
}

const ACTIVE = new Set(["trialing", "active", "past_due"]);

export interface EngineEntitlement {
  plan: EnginePlanKey;
  planName: string;
  status: string | null;
  activeMissions: number;
  activeMissionLimit: number;
  aiTasksToday: number;
  aiTasksPerDay: number;
  periodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
}

export async function getEngineAccount(accountId: string) {
  const db = await edb();
  const [row] = await db.select().from(schema.engineAccounts).where(eq(schema.engineAccounts.id, accountId)).limit(1);
  return row ?? null;
}

export async function ensureEngineAccount(accountId: string) {
  const existing = await getEngineAccount(accountId);
  if (existing) return existing;
  const db = await edb();
  const [row] = await db.insert(schema.engineAccounts).values({ id: accountId }).onConflictDoNothing().returning();
  return row ?? (await getEngineAccount(accountId))!;
}

export async function getEngineEntitlement(accountId: string): Promise<EngineEntitlement> {
  const account = await getEngineAccount(accountId);
  const live = account && account.plan !== "free" && ACTIVE.has(account.subscriptionStatus ?? "");
  const plan: EnginePlanKey = live && ENGINE_PLAN_KEYS.includes(account.plan) ? account.plan : "free";
  const def = ENGINE_PLANS[plan];
  const dayAgo = new Date(Date.now() - 86_400_000);
  const [activeMissions, aiTasksToday] = await Promise.all([countActiveMissions(accountId), countAiTasksSince(accountId, dayAgo)]);
  return {
    plan,
    planName: def.name,
    status: account?.subscriptionStatus ?? null,
    activeMissions,
    activeMissionLimit: def.activeMissions,
    aiTasksToday,
    aiTasksPerDay: def.aiTasksPerDay,
    periodEnd: account?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: account?.cancelAtPeriodEnd ?? false,
    hasStripeCustomer: Boolean(account?.stripeCustomerId),
  };
}

export function assertCanCreateMission(e: EngineEntitlement): void {
  if (e.activeMissions >= e.activeMissionLimit) {
    throw new EngineActionError(
      e.plan === "free"
        ? `Explorer includes ${e.activeMissionLimit} active missions. Pause or cancel one, or upgrade.`
        : `You've reached the ${e.activeMissionLimit} active missions on ${e.planName}.`,
      undefined,
      "limit_reached",
    );
  }
}

export function assertCanRunAi(e: EngineEntitlement): void {
  if (e.aiTasksToday >= e.aiTasksPerDay) {
    throw new EngineActionError(
      `Daily AI task limit reached (${e.aiTasksPerDay}/day on ${e.planName}). Try again tomorrow or upgrade.`,
      undefined,
      "quota",
    );
  }
}

export async function applyEngineSubscription(
  accountId: string,
  data: {
    customerId: string;
    subscriptionId: string;
    plan: EnginePlanKey;
    status: string;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    paymentFailed: boolean;
  },
) {
  const db = await edb();
  const values = {
    stripeCustomerId: data.customerId,
    stripeSubscriptionId: data.subscriptionId,
    plan: data.plan,
    subscriptionStatus: data.status,
    currentPeriodEnd: data.currentPeriodEnd,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd,
    paymentFailedAt: data.paymentFailed ? new Date() : null,
    updatedAt: new Date(),
  };
  await db
    .insert(schema.engineAccounts)
    .values({ id: accountId, ...values })
    .onConflictDoUpdate({ target: schema.engineAccounts.id, set: values });
}

export async function findEngineAccountByCustomer(customerId: string): Promise<string | null> {
  const db = await edb();
  const [row] = await db
    .select({ id: schema.engineAccounts.id })
    .from(schema.engineAccounts)
    .where(eq(schema.engineAccounts.stripeCustomerId, customerId))
    .limit(1);
  return row?.id ?? null;
}

export async function setEngineStripeCustomer(accountId: string, customerId: string) {
  const db = await edb();
  await db
    .insert(schema.engineAccounts)
    .values({ id: accountId, stripeCustomerId: customerId })
    .onConflictDoUpdate({
      target: schema.engineAccounts.id,
      set: { stripeCustomerId: customerId, updatedAt: new Date() },
    });
}

export async function recordStripeEvent(id: string, type: string): Promise<boolean> {
  const db = await edb();
  const rows = await db.insert(schema.engineStripeEvents).values({ id, type }).onConflictDoNothing().returning({ id: schema.engineStripeEvents.id });
  return rows.length > 0;
}

export async function findEngineAccountIdByCustomer(customerId: string) {
  return findEngineAccountByCustomer(customerId);
}
