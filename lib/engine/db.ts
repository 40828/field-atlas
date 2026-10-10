import { io } from "next/cache";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * The engine talks to Postgres through Drizzle's driver-agnostic `PgDatabase`, so production uses
 * Neon over HTTP while tests run the very same queries against PGlite (real Postgres in WASM).
 *
 * Neon's HTTP driver has no interactive transactions, so every multi-step invariant in the engine
 * is expressed as ONE atomic SQL statement (e.g. the task claim) or is safe to repeat.
 */
export type EngineDb = PgDatabase<PgQueryResultHKT, typeof schema>;

let client: EngineDb | null = null;
let override: EngineDb | null = null;

function create(): EngineDb {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Provision Neon (vercel integration add neon) and pull env vars.");
  }
  return drizzle(neon(url), { schema }) as unknown as EngineDb;
}

export function databaseConfigured(): boolean {
  return Boolean(override ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL);
}

/** Test seam: route every engine query to a different database. */
export function setEngineDbForTests(db: EngineDb | null): void {
  override = db;
}

/** Marks the following work as request-time I/O (Cache Components), then returns the client. */
export async function edb(): Promise<EngineDb> {
  await io();
  return override ?? (client ??= create());
}

export { schema };
