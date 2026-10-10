import "server-only";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ActionErrorCode } from "../types";

/**
 * Authentication + abuse protection for server actions and pages.
 *
 * Tenancy: `accountId` is the Clerk organization id when the user is acting inside an
 * organization, otherwise their own user id. Every repository query is scoped by it.
 */

export interface Session {
  userId: string;
  /** Tenant key for data ownership and billing. */
  accountId: string;
}

export class ActionError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string>,
    readonly code?: ActionErrorCode,
  ) {
    super(message);
    this.name = "ActionError";
  }
}

function toSession(a: Awaited<ReturnType<typeof auth>>): Session | null {
  if (!a.userId) return null;
  return { userId: a.userId, accountId: a.orgId ?? a.userId };
}

/** For server actions: throws an `ActionError` the wrapper turns into `{ ok: false }`. */
export async function requireSession(): Promise<Session> {
  const session = toSession(await auth());
  if (!session) throw new ActionError("Please sign in to continue.", undefined, "unauthorized");
  return session;
}

/** For pages and layouts: redirects to sign-in instead of throwing. */
export async function requirePageSession(): Promise<Session> {
  const session = toSession(await auth());
  if (!session) redirect("/sign-in");
  return session;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const globalForLimit = globalThis as typeof globalThis & { __voltlineLimits?: Map<string, Bucket> };

/**
 * Fixed-window in-memory limiter that smooths bursts within one server instance. It is *not* a
 * hard global limit across serverless instances; the durable per-account caps (daily analysis
 * cap, plan proposal limit) are enforced against the database in `lib/billing/entitlements.ts`.
 */
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
