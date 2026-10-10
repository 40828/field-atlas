import Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import {
  applyEngineSubscription,
  findEngineAccountByCustomer,
  parseEngineLookupKey,
  recordStripeEvent,
} from "@/lib/engine/entitlements";
import { addLedgerEntry } from "@/lib/engine/repo/ledger";

const SUB_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

async function syncSubscription(subscriptionId: string) {
  const sub = await getStripe().subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const accountId = sub.metadata?.accountId || (await findEngineAccountByCustomer(customerId));
  if (!accountId) {
    console.error("[ame-stripe] subscription has no matching account", sub.id);
    return;
  }
  const lookup = sub.items.data.map((i) => parseEngineLookupKey(i.price.lookup_key)).find(Boolean);
  const periodEnd = sub.items.data[0]?.current_period_end
    ? new Date(sub.items.data[0].current_period_end * 1000)
    : null;
  await applyEngineSubscription(accountId, {
    customerId,
    subscriptionId: sub.id,
    plan: lookup?.plan ?? "free",
    status: sub.status,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    paymentFailed: sub.status === "past_due" || sub.status === "unpaid",
  });
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_ENGINE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Webhook not configured", { status: 400 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const first = await recordStripeEvent(event.id, event.type);
  if (!first) return Response.json({ received: true, duplicate: true });

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (subId) await syncSubscription(subId);
    } else if (SUB_EVENTS.has(event.type)) {
      await syncSubscription((event.data.object as Stripe.Subscription).id);
    } else if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      const accountId = invoice.metadata?.accountId || (customerId ? await findEngineAccountByCustomer(customerId) : null);
      if (accountId && invoice.amount_paid > 0 && invoice.id) {
        await addLedgerEntry({
          accountId,
          kind: "expense",
          amountCents: invoice.amount_paid,
          description: `Platform subscription (${invoice.billing_reason ?? "invoice"})`,
          source: "stripe",
          sourceRef: invoice.id,
          verification: "provider_verified",
          occurredAt: new Date((invoice.created ?? Date.now() / 1000) * 1000),
        });
      }
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
      const accountId = customerId ? await findEngineAccountByCustomer(customerId) : null;
      if (accountId && charge.amount_refunded > 0) {
        await addLedgerEntry({
          accountId,
          kind: "refund",
          amountCents: charge.amount_refunded,
          description: "Stripe refund",
          source: "stripe",
          sourceRef: `refund:${charge.id}`,
          verification: "provider_verified",
          occurredAt: new Date(),
        });
      }
    }
  } catch (err) {
    console.error("[ame-stripe] handler failed", event.type, err);
    return new Response("Handler error", { status: 500 });
  }

  return Response.json({ received: true });
}
