import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Server-owned usage state, stored in a signed HttpOnly cookie.
 *
 * The browser can't read or modify it (HttpOnly) and can't forge it (HMAC), so
 * the free-tier counter and Pro flag can be trusted by the API routes.
 * Without user accounts a visitor can still reset their quota by clearing
 * cookies; accounts + a database are the next step if that matters.
 */
export interface AtlasState {
  /** Maps generated on the free tier. */
  n: number;
  /** Verified Stripe payment. */
  pro: boolean;
}

const COOKIE = "fa_state";
const MAX_AGE = 60 * 60 * 24 * 365;
const EMPTY: AtlasState = { n: 0, pro: false };

function secret(): string {
  const s = process.env.ATLAS_COOKIE_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV !== "production") return "dev-only-secret-do-not-use-in-prod";
  throw new Error("ATLAS_COOKIE_SECRET must be set (at least 16 characters) in production.");
}

const b64 = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");
const mac = (payload: string) => createHmac("sha256", secret()).update(payload).digest();

function encode(state: AtlasState): string {
  const payload = b64(JSON.stringify({ v: 1, n: state.n, pro: state.pro }));
  return `${payload}.${b64(mac(payload))}`;
}

function decode(value: string | undefined): AtlasState {
  if (!value) return EMPTY;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return EMPTY;

  const expected = mac(payload);
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return EMPTY;

  try {
    const o = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    if (o.v !== 1 || typeof o.n !== "number" || !Number.isInteger(o.n) || o.n < 0) return EMPTY;
    return { n: o.n, pro: o.pro === true };
  } catch {
    return EMPTY;
  }
}

export async function readState(): Promise<AtlasState> {
  const store = await cookies();
  return decode(store.get(COOKIE)?.value);
}

export async function writeState(state: AtlasState): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, encode(state), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}
