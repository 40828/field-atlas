/**
 * Creates AME Stripe products/prices with lookup keys ame_{pro|scale}_{monthly|annual}.
 * Safe to re-run: existing lookup keys are left alone.
 *
 *   npm run engine:stripe-setup
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is not set.");
  process.exit(1);
}

const stripe = new Stripe(key);
const ANNUAL_DISCOUNT = 0.2;

const PLANS = [
  { key: "pro", name: "AME Operator", monthly: 49 },
  { key: "scale", name: "AME Studio", monthly: 199 },
] as const;

async function main() {
  for (const plan of PLANS) {
    const product = await stripe.products.create({
      name: plan.name,
      metadata: { product: "ame", plan: plan.key },
    });
    for (const interval of ["monthly", "annual"] as const) {
      const lookup_key = `ame_${plan.key}_${interval}`;
      const existing = await stripe.prices.list({ lookup_keys: [lookup_key], limit: 1 });
      if (existing.data[0]) {
        console.log("exists", lookup_key, existing.data[0].id);
        continue;
      }
      const unit_amount = interval === "annual" ? Math.round(plan.monthly * 12 * (1 - ANNUAL_DISCOUNT) * 100) : plan.monthly * 100;
      const price = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount,
        recurring: { interval: interval === "annual" ? "year" : "month" },
        lookup_key,
        metadata: { product: "ame", plan: plan.key, interval },
      });
      console.log("created", lookup_key, price.id);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
