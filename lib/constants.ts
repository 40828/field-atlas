/** Number of maps a free user can generate before the paywall locks the app. */
export const FREE_MAP_LIMIT = 15;

/**
 * Where every "Upgrade" button sends the user (always opened in a new tab).
 * Override with NEXT_PUBLIC_STRIPE_CHECKOUT_URL to point at a specific
 * Stripe Payment Link without touching code.
 */
export const STRIPE_CHECKOUT_URL =
  process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_URL || "https://stripe.com";

/** localStorage keys. */
export const COUNT_STORAGE_KEY = "fieldAtlasMapCount";
export const PRO_STORAGE_KEY = "fieldAtlasPro";

/** Query parameter Stripe redirects back with after a successful payment. */
export const PAYMENT_PARAM = "pay_success";

/** Stripe fills this in when the Payment Link success URL contains {CHECKOUT_SESSION_ID}. */
export const SESSION_PARAM = "session_id";

export const EXAMPLE_FIELDS = [
  "Physics",
  "Feynman path integrals",
  "Economics",
  "Genetics",
  "Music theory",
  "Machine learning",
] as const;
