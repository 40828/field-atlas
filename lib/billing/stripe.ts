import "server-only";
import Stripe from "stripe";

/**
 * Lazily-constructed Stripe client so `next build` works before keys exist.
 * Set STRIPE_SECRET_KEY (test keys start with `sk_test_`). Never log or return it.
 */
let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  return (client ??= new Stripe(key, { appInfo: { name: "Voltline" } }));
}

export const billingConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

/** Absolute site URL for Checkout/Portal return links. */
export function appUrl(): string {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
