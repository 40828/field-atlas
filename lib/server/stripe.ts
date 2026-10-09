import "server-only";

export type VerifyResult =
  | { ok: true }
  | {
      ok: false;
      code: "invalid" | "unpaid" | "expired" | "not_configured" | "stripe_error";
    };

/** Real Checkout Session ids look like cs_live_a1B2... (alphanumeric only). */
const SESSION_RE = /^cs_(test|live)_[A-Za-z0-9]{10,250}$/;

/** A session older than this can't be used to unlock (limits reuse of leaked URLs). */
const MAX_SESSION_AGE_S = 48 * 60 * 60;

/** Local-only escape hatch so the unlock flow can be tried without Stripe keys. */
export const DEV_UNLOCK_SESSION = "cs_test_dev_unlock";

interface StripeSession {
  status?: string;
  payment_status?: string;
  payment_link?: string | null;
  created?: number;
}

/**
 * Confirms with Stripe that a Checkout Session was actually paid.
 *
 * Env:
 *  - STRIPE_SECRET_KEY        required (sk_live_... / sk_test_...). Server-only.
 *  - STRIPE_PAYMENT_LINK_ID   optional but recommended (plink_...). When set, only
 *                             sessions created by that Payment Link are accepted.
 */
export async function verifyCheckoutSession(sessionId: string): Promise<VerifyResult> {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    if (process.env.NODE_ENV === "development" && sessionId === DEV_UNLOCK_SESSION) {
      return { ok: true };
    }
    return { ok: false, code: "not_configured" };
  }

  if (!SESSION_RE.test(sessionId)) return { ok: false, code: "invalid" };

  let res: Response;
  try {
    res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
  } catch {
    return { ok: false, code: "stripe_error" };
  }

  if (res.status === 404) return { ok: false, code: "invalid" };
  if (!res.ok) return { ok: false, code: "stripe_error" };

  const s = (await res.json()) as StripeSession;

  if (s.status !== "complete" || s.payment_status !== "paid") return { ok: false, code: "unpaid" };

  const expectedLink = process.env.STRIPE_PAYMENT_LINK_ID;
  if (expectedLink && s.payment_link !== expectedLink) return { ok: false, code: "invalid" };

  if (typeof s.created === "number" && Date.now() / 1000 - s.created > MAX_SESSION_AGE_S) {
    return { ok: false, code: "expired" };
  }

  return { ok: true };
}
