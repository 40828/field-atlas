"use server";

import { z } from "zod";
import type { ActionResult } from "@/lib/solar/types";
import { ActionError } from "@/lib/solar/server/session";
import { guarded } from "@/lib/solar/server/guarded";
import { appUrl, billingConfigured, getStripe } from "./stripe";
import { ensureAccount, setStripeCustomer } from "./accounts";
import { ACTIVE_SUBSCRIPTION_STATUSES, BILLING_INTERVALS, PAID_PLAN_KEYS, TRIAL_DAYS, lookupKey } from "./plans";

const checkoutSchema = z.object({
  plan: z.enum(PAID_PLAN_KEYS),
  interval: z.enum(BILLING_INTERVALS),
});

function requireBilling() {
  if (!billingConfigured()) throw new ActionError("Billing isn't available yet. Please contact support.");
}

/** Resolve (or create exactly once) the Stripe customer for an account. */
async function customerFor(accountId: string, userId: string) {
  const account = await ensureAccount(accountId);
  if (account.stripeCustomerId) return { account, customerId: account.stripeCustomerId };
  const customer = await getStripe().customers.create(
    { metadata: { accountId, createdBy: userId } },
    { idempotencyKey: `voltline-customer-${accountId}` },
  );
  await setStripeCustomer(accountId, customer.id);
  return { account, customerId: customer.id };
}

/** Start a Stripe Checkout subscription. Returns the hosted-checkout URL to redirect to. */
export async function startCheckoutAction(input: {
  plan: string;
  interval: string;
}): Promise<ActionResult<{ url: string }>> {
  return guarded("checkout", { max: 10, windowMs: 60_000 }, async ({ accountId, userId }) => {
    requireBilling();
    const { plan, interval } = checkoutSchema.parse(input);
    const stripe = getStripe();
    const { account, customerId } = await customerFor(accountId, userId);

    if ((ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(account.subscriptionStatus ?? "")) {
      throw new ActionError("You already have a subscription. Use “Manage billing” to change plans.");
    }

    const prices = await stripe.prices.list({ lookup_keys: [lookupKey(plan, interval)], active: true, limit: 1 });
    const price = prices.data[0];
    if (!price) throw new ActionError("That plan isn't available yet. Please contact support.");

    const base = appUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: accountId,
      line_items: [{ price: price.id, quantity: 1 }],
      subscription_data: {
        // Only first-time subscribers get the trial.
        ...(account.stripeSubscriptionId ? {} : { trial_period_days: TRIAL_DAYS }),
        metadata: { accountId },
      },
      metadata: { accountId },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: `${base}/dashboard/billing?checkout=success`,
      cancel_url: `${base}/dashboard/billing?checkout=canceled`,
    });
    if (!session.url) throw new ActionError("Couldn't start checkout. Please try again.");
    return { url: session.url };
  });
}

/** Open the Stripe Billing Portal (update card, switch plan, cancel, invoices). */
export async function openBillingPortalAction(): Promise<ActionResult<{ url: string }>> {
  return guarded("portal", { max: 10, windowMs: 60_000 }, async ({ accountId }) => {
    requireBilling();
    const account = await ensureAccount(accountId);
    if (!account.stripeCustomerId) throw new ActionError("No billing profile yet. Start a plan first.");
    const portal = await getStripe().billingPortal.sessions.create({
      customer: account.stripeCustomerId,
      return_url: `${appUrl()}/dashboard/billing`,
      ...(process.env.STRIPE_PORTAL_CONFIG_ID ? { configuration: process.env.STRIPE_PORTAL_CONFIG_ID } : {}),
    });
    return { url: portal.url };
  });
}
