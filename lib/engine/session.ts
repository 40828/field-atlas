import "server-only";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export interface EngineSession {
  userId: string;
  accountId: string;
}

export class EngineActionError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string>,
    readonly code?: string,
  ) {
    super(message);
    this.name = "EngineActionError";
  }
}

function toSession(a: Awaited<ReturnType<typeof auth>>): EngineSession | null {
  if (!a.userId) return null;
  return { userId: a.userId, accountId: a.orgId ?? a.userId };
}

export async function requireEngineSession(): Promise<EngineSession> {
  const session = toSession(await auth());
  if (!session) throw new EngineActionError("Please sign in to continue.", undefined, "unauthorized");
  return session;
}

export async function requireEnginePage(): Promise<EngineSession> {
  const session = toSession(await auth());
  if (!session) redirect("/sign-in?redirect_url=/engine/app");
  return session;
}

export async function optionalEngineSession(): Promise<EngineSession | null> {
  return toSession(await auth());
}

interface Bucket {
  count: number;
  resetAt: number;
}

const globalForLimit = globalThis as typeof globalThis & { __ameLimits?: Map<string, Bucket> };

export function engineRateLimit(key: string, limit: number, windowMs: number): void {
  const buckets = (globalForLimit.__ameLimits ??= new Map());
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (bucket.count >= limit) {
    const seconds = Math.ceil((bucket.resetAt - now) / 1000);
    throw new EngineActionError(`Too many requests. Try again in ${seconds}s.`);
  }
  bucket.count += 1;
}
