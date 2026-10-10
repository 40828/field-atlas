import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/lib/engine/schema";
import { setEngineDbForTests, type EngineDb } from "@/lib/engine/db";

function applySql(sql: string): string[] {
  return sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function openTestDb(): Promise<{ db: EngineDb; close: () => Promise<void> }> {
  const client = new PGlite();
  const files = ["0001_autonomous_money_engine.sql", "0002_ame_catalog.sql"];
  for (const file of files) {
    const full = path.join(process.cwd(), "drizzle", file);
    try {
      const sql = readFileSync(full, "utf8");
      for (const stmt of applySql(sql)) {
        await client.exec(stmt);
      }
    } catch (err) {
      if (file === "0002_ame_catalog.sql" && (err as NodeJS.ErrnoException).code === "ENOENT") {
        await client.exec(`
          ALTER TABLE engine_projects ADD COLUMN IF NOT EXISTS listed_in_catalog boolean DEFAULT false NOT NULL;
          CREATE TABLE IF NOT EXISTS engine_favorites (
            account_id text NOT NULL,
            project_id uuid NOT NULL REFERENCES engine_projects(id) ON DELETE CASCADE,
            created_at timestamptz DEFAULT now() NOT NULL,
            PRIMARY KEY (account_id, project_id)
          );
          CREATE TABLE IF NOT EXISTS engine_businesses (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            account_id text NOT NULL,
            name text NOT NULL,
            summary text DEFAULT '' NOT NULL,
            asking_cents bigint,
            listed boolean DEFAULT false NOT NULL,
            assumptions text DEFAULT '' NOT NULL,
            financial_notes text DEFAULT '' NOT NULL,
            created_at timestamptz DEFAULT now() NOT NULL,
            updated_at timestamptz DEFAULT now() NOT NULL
          );
          CREATE INDEX IF NOT EXISTS engine_businesses_account_idx ON engine_businesses (account_id, created_at);
        `);
        continue;
      }
      throw err;
    }
  }
  const db = drizzle(client, { schema }) as unknown as EngineDb;
  setEngineDbForTests(db);
  return {
    db,
    close: async () => {
      setEngineDbForTests(null);
      await client.close();
    },
  };
}
