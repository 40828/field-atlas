import Stripe from "stripe";
import { applySubscription, findAccountIdByCustomer } from "@/lib/billing/accounts";
import { getStripe } from "@/lib/billing/stripe";

/**
 * Stripe webhook. Public route (excluded from Clerk protection in proxy.ts); authenticity comes
 * from verifying the signature over the RAW body.
 *
 * Design: we never trust the event payload's contents. On every relevant event we re-retrieve the
 * subscription from Stripe and mirror its current state, so handling is idempotent and safe
 * against retries and out-of-order delivery.
 */

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.trial_will_end",
]);

async function accountIdFor(sub: Stripe.Subscription): Promise<string | null> {
  if (sub.metadata?.accountId) return sub.metadata.accountId;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  return findAccountIdByCustomer(customerId);
}

async function syncSubscription(subscriptionId: string) {
  const sub = await getStripe().subscriptions.retrieve(subscriptionId);
  const accountId = await accountIdFor(sub);
  if (!accountId) {
    console.error("[stripe-webhook] subscription has no matching account", sub.id);
    return;
  }
  await applySubscription(accountId, sub);
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Webhook not configured", { status: 400 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (subId) await syncSubscription(subId);
    } else if (SUBSCRIPTION_EVENTS.has(event.type)) {
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscription(sub.id);
    }
  } catch (err) {
    // A 500 makes Stripe retry with backoff.
    console.error("[stripe-webhook] handler failed", event.type, err);
    return new Response("Handler error", { status: 500 });
  }

  return Response.json({ received: true });
}
