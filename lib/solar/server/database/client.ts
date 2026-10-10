import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Lazily-created Drizzle client over Neon's HTTP driver (one stateless HTTP request per query,
 * which suits serverless). Created on first use, not at import time, so `next build` succeeds
 * before the database env vars exist. Use a plain function, not a Proxy wrapper.
 */
function create() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Provision Neon (vercel integration add neon) and pull env vars.");
  }
  return drizzle(neon(url), { schema });
}

let client: ReturnType<typeof create> | null = null;

export function getDb() {
  return (client ??= create());
}

export { schema };
