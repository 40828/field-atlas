import "server-only";
import { ZodError } from "zod";
import type { EngineActionResult } from "./types";
import { EngineActionError, engineRateLimit, requireEngineSession, type EngineSession } from "./session";

function flattenZod(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.map(String).join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function engineGuarded<T>(
  action: string,
  limit: { max: number; windowMs: number },
  run: (session: EngineSession) => Promise<T>,
): Promise<EngineActionResult<T>> {
  try {
    const session = await requireEngineSession();
    engineRateLimit(`${session.userId}:${action}`, limit.max, limit.windowMs);
    return { ok: true, data: await run(session) };
  } catch (err) {
    if (err instanceof EngineActionError) {
      return { ok: false, error: err.message, fieldErrors: err.fieldErrors, code: err.code };
    }
    if (err instanceof ZodError) {
      const fieldErrors = flattenZod(err);
      return { ok: false, error: Object.values(fieldErrors)[0] ?? "Invalid input", fieldErrors };
    }
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error(`[engine:${action}]`, err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
