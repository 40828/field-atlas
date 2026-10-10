/**
 * Simulated auth + abuse protection for server actions.
 *
 * Replace `requireSession` with your real auth provider (Auth.js, Clerk, …) and
 * `rateLimit` with Redis/Upstash. The call sites stay identical.
 */

export interface Session {
  userId: string;
  orgId: string;
  role: "estimator" | "admin";
}

export class ActionError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ActionError";
  }
}

export async function requireSession(): Promise<Session> {
  // A real implementation would read `cookies()` and verify a signed session.
  return { userId: "usr_demo_01", orgId: "org_voltline_demo", role: "estimator" };
}

interface Bucket {
  count: number;
  resetAt: number;
}

const globalForLimit = globalThis as typeof globalThis & { __voltlineLimits?: Map<string, Bucket> };

/** Fixed-window in-memory limiter. Throws `ActionError` when exceeded. */
export function rateLimit(key: string, limit: number, windowMs: number): void {
  const buckets = (globalForLimit.__voltlineLimits ??= new Map());
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (bucket.count >= limit) {
    const seconds = Math.ceil((bucket.resetAt - now) / 1000);
    throw new ActionError(`Too many requests. Try again in ${seconds}s.`);
  }
  bucket.count += 1;
}
