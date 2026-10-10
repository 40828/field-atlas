import "server-only";
import { io } from "next/cache";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { getDb, schema } from "@/lib/solar/server/database/client";
import type { AccountRow } from "@/lib/solar/server/database/schema";
import { ACTIVE_SUBSCRIPTION_STATUSES, parseLookupKey } from "./plans";

const { accounts } = schema;

export async function getAccount(accountId: string): Promise<AccountRow | null> {
  await io();
  const [row] = await getDb().select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  return row ?? null;
}

export async function ensureAccount(accountId: string): Promise<AccountRow> {
  await io();
  const db = getDb();
  await db.insert(accounts).values({ id: accountId }).onConflictDoNothing();
  const [row] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  return row;
}

export async function setStripeCustomer(accountId: string, stripeCustomerId: string): Promise<void> {
  await io();
  await getDb()
    .update(accounts)
    .set({ stripeCustomerId, updatedAt: new Date() })
    .where(eq(accounts.id, accountId));
}

export async function findAccountIdByCustomer(stripeCustomerId: string): Promise<string | null> {
  await io();
  const [row] = await getDb()
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.stripeCustomerId, stripeCustomerId))
    .limit(1);
  return row?.id ?? null;
}

const fromUnix = (s: number | null | undefined) => (s ? new Date(s * 1000) : null);

/**
 * Mirror a Stripe subscription onto the account. The webhook always re-fetches the
 * subscription and calls this, so it is idempotent and safe against out-of-order events.
 */
export async function applySubscription(accountId: string, sub: Stripe.Subscription): Promise<void> {
  await io();
  const item = sub.items.data[0];
  const parsed = parseLookupKey(item?.price.lookup_key);
  const live = (ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(sub.status);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const values = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    plan: live && parsed ? parsed.plan : ("free" as const),
    subscriptionStatus: sub.status,
    billingInterval: parsed?.interval ?? null,
    currentPeriodStart: fromUnix(item?.current_period_start),
    currentPeriodEnd: fromUnix(item?.current_period_end),
    trialEnd: fromUnix(sub.trial_end),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    updatedAt: new Date(),
  };
  await getDb()
    .insert(accounts)
    .values({ id: accountId, ...values })
    .onConflictDoUpdate({ target: accounts.id, set: values });
}
