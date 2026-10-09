/** Thin browser wrappers around the entitlement and Stripe-verification endpoints. */

export interface Entitlement {
  pro: boolean;
  count: number;
}

export async function fetchEntitlement(): Promise<Entitlement | null> {
  try {
    const res = await fetch("/api/entitlement", { cache: "no-store" });
    if (!res.ok) return null;
    const d = (await res.json()) as Entitlement;
    return { pro: d.pro === true, count: Number(d.count) || 0 };
  } catch {
    return null;
  }
}

/** Asks the server to confirm with Stripe that this Checkout Session was paid. */
export async function verifyPayment(sessionId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/stripe/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
