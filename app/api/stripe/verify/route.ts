import { writeState } from "@/lib/server/state";
import { verifyCheckoutSession } from "@/lib/server/stripe";

const STATUS: Record<string, number> = {
  invalid: 400,
  unpaid: 402,
  expired: 410,
  not_configured: 503,
  stripe_error: 502,
};

/**
 * Called by the browser after Stripe redirects back with ?session_id=...
 * Only a session Stripe reports as paid flips this browser's signed cookie to Pro.
 */
export async function POST(request: Request) {
  let sessionId: unknown;
  try {
    ({ sessionId } = (await request.json()) as { sessionId?: unknown });
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  if (typeof sessionId !== "string" || sessionId.length === 0 || sessionId.length > 300) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  const result = await verifyCheckoutSession(sessionId);
  if (!result.ok) {
    return Response.json({ error: result.code }, { status: STATUS[result.code] ?? 400 });
  }

  await writeState({ n: 0, pro: true });

  return Response.json({ pro: true, count: 0 }, { headers: { "Cache-Control": "no-store" } });
}
