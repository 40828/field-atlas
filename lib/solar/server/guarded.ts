import "server-only";
import { ZodError } from "zod";
import { flattenIssues } from "../schemas";
import type { ActionResult } from "../types";
import { ActionError, rateLimit, requireSession, type Session } from "./session";

/**
 * Hardened server-action pipeline shared by every action:
 *   1. authenticate (`requireSession`)
 *   2. rate-limit per user + action
 *   3. run the handler (which re-validates ALL input with Zod; client checks are never trusted)
 *   4. return a typed `ActionResult`, never throw to the client
 */
export async function guarded<T>(
  action: string,
  limit: { max: number; windowMs: number },
  run: (session: Session) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const session = await requireSession();
    rateLimit(`${session.userId}:${action}`, limit.max, limit.windowMs);
    return { ok: true, data: await run(session) };
  } catch (err) {
    if (err instanceof ActionError) {
      return { ok: false, error: err.message, fieldErrors: err.fieldErrors, code: err.code };
    }
    if (err instanceof ZodError) {
      const fieldErrors = flattenIssues(err);
      return { ok: false, error: Object.values(fieldErrors)[0] ?? "Invalid input", fieldErrors };
    }
    // Next.js control-flow errors (redirect/notFound) must propagate.
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error(`[action:${action}]`, err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
