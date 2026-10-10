/**
 * One-time (and re-runnable) Stripe setup for Voltline.
 *
 *   npm run stripe:setup                         create products + prices + billing-portal config
 *   npm run stripe:setup -- --webhook <url>      also register the webhook endpoint
 *
 * Reads STRIPE_SECRET_KEY from .env.local. Idempotent: prices are found by lookup key, so
 * re-running never duplicates them. Secrets are never printed; a newly created webhook signing
 * secret and the portal configuration id are appended to .env.local (which is gitignored).
 * To change a price: edit lib/billing/plans.ts, re-run, then archive the old Price in Stripe.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import Stripe from "stripe";
import { BILLING_INTERVALS, PAID_PLAN_KEYS, PLANS, chargePerCycle, lookupKey } from "../lib/billing/plans";

const ENV_FILE = ".env.local";
const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is missing from .env.local");
  process.exit(1);
}
const mode = key.startsWith("sk_live_") ? "LIVE" : "test";
const stripe = new Stripe(key, { appInfo: { name: "Voltline setup" } });

const hasEnv = (name: string) => existsSync(ENV_FILE) && new RegExp(`^${name}=`, "m").test(readFileSync(ENV_FILE, "utf8"));
const saveEnv = (name: string, value: string) => appendFileSync(ENV_FILE, `\n${name}=${value}\n`);

async function ensureProduct(plan: (typeof PAID_PLAN_KEYS)[number]) {
  const metaKey = `voltline_${plan}`;
  const found = await stripe.products.search({ query: `metadata['voltline_plan']:'${metaKey}' AND active:'true'`, limit: 1 });
  if (found.data[0]) return found.data[0];
  return stripe.products.create({
    name: `Voltline ${PLANS[plan].name}`,
    metadata: { voltline_plan: metaKey },
  });
}

async function main() {
  console.log(`Stripe mode: ${mode}`);

  for (const plan of PAID_PLAN_KEYS) {
    const product = await ensureProduct(plan);
    for (const interval of BILLING_INTERVALS) {
      const lookup = lookupKey(plan, interval);
      const existing = await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 1 });
      const amount = chargePerCycle(plan, interval) * 100;
      if (existing.data[0]) {
        const same = existing.data[0].unit_amount === amount;
        console.log(`${same ? "ok     " : "DIFFERS"} ${lookup} (${existing.data[0].id})${same ? "" : ": amount in Stripe differs from plans.ts; archive it and re-run"}`);
        continue;
      }
      const price = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: amount,
        recurring: { interval: interval === "annual" ? "year" : "month" },
        lookup_key: lookup,
      });
      console.log(`created ${lookup} (${price.id}) $${amount / 100}`);
    }
  }

  if (!hasEnv("STRIPE_PORTAL_CONFIG_ID")) {
    const products = await Promise.all(PAID_PLAN_KEYS.map(ensureProduct));
    const prices = await Promise.all(
      products.map(async (p) => (await stripe.prices.list({ product: p.id, active: true, limit: 10 })).data.map((x) => x.id)),
    );
    const config = await stripe.billingPortal.configurations.create({
      business_profile: { headline: "Manage your Voltline subscription" },
      features: {
        customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id"] },
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: "at_period_end" },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ["price"],
          proration_behavior: "create_prorations",
          products: products.map((p, i) => ({ product: p.id, prices: prices[i] })),
        },
      },
    });
    saveEnv("STRIPE_PORTAL_CONFIG_ID", config.id);
    console.log(`created billing portal configuration (saved to ${ENV_FILE})`);
  } else {
    console.log("ok      billing portal configuration already saved");
  }

  const flag = process.argv.indexOf("--webhook");
  if (flag !== -1) {
    const url = process.argv[flag + 1];
    if (!url?.startsWith("https://")) throw new Error("--webhook needs an https:// URL, e.g. https://your-domain/api/billing/webhook");
    const existing = await stripe.webhookEndpoints.list({ limit: 100 });
    if (existing.data.some((w) => w.url === url)) {
      console.log(`ok      webhook already registered for ${url}`);
    } else {
      const hook = await stripe.webhookEndpoints.create({
        url,
        description: "Voltline subscriptions",
        enabled_events: [
          "checkout.session.completed",
          "customer.subscription.created",
          "customer.subscription.updated",
          "customer.subscription.deleted",
          "customer.subscription.paused",
          "customer.subscription.resumed",
        ],
      });
      if (hook.secret) saveEnv("STRIPE_WEBHOOK_SECRET", hook.secret);
      console.log(`created webhook ${hook.id} for ${url} (signing secret saved to ${ENV_FILE})`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
