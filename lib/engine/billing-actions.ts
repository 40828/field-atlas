"use server";

import { z } from "zod";
import { appUrl, billingConfigured, getStripe } from "@/lib/billing/stripe";
import { engineGuarded } from "./guarded";
import { EngineActionError } from "./session";
import {
  ENGINE_PAID_PLANS,
  engineLookupKey,
  ensureEngineAccount,
  setEngineStripeCustomer,
} from "./entitlements";

const checkoutSchema = z.object({
  plan: z.enum(ENGINE_PAID_PLANS),
  interval: z.enum(["monthly", "annual"]),
});

export async function startEngineCheckoutAction(input: { plan: string; interval: string }) {
  return engineGuarded("engine-checkout", { max: 10, windowMs: 60_000 }, async ({ accountId, userId }) => {
    if (!billingConfigured()) throw new EngineActionError("Stripe is not configured.");
    const { plan, interval } = checkoutSchema.parse(input);
    const stripe = getStripe();
    const account = await ensureEngineAccount(accountId);
    let customerId = account.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create(
        { metadata: { accountId, product: "ame", createdBy: userId } },
        { idempotencyKey: `ame-customer-${accountId}` },
      );
      customerId = customer.id;
      await setEngineStripeCustomer(accountId, customerId);
    }
    const prices = await stripe.prices.list({ lookup_keys: [engineLookupKey(plan, interval)], active: true, limit: 1 });
    const price = prices.data[0];
    if (!price) throw new EngineActionError("That plan is not in Stripe yet. Run `npm run engine:stripe-setup`.");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: accountId,
      line_items: [{ price: price.id, quantity: 1 }],
      subscription_data: { metadata: { accountId, product: "ame" } },
      metadata: { accountId, product: "ame" },
      success_url: `${appUrl()}/engine/app/billing?checkout=success`,
      cancel_url: `${appUrl()}/engine/app/billing?checkout=canceled`,
    });
    if (!session.url) throw new EngineActionError("Could not start checkout.");
    return { url: session.url };
  });
}

export async function openEnginePortalAction() {
  return engineGuarded("engine-portal", { max: 10, windowMs: 60_000 }, async ({ accountId }) => {
    if (!billingConfigured()) throw new EngineActionError("Stripe is not configured.");
    const account = await ensureEngineAccount(accountId);
    if (!account.stripeCustomerId) throw new EngineActionError("No billing profile yet. Start a plan first.");
    const portal = await getStripe().billingPortal.sessions.create({
      customer: account.stripeCustomerId,
      return_url: `${appUrl()}/engine/app/billing`,
    });
    return { url: portal.url };
  });
}
