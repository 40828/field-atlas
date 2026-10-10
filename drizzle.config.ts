import { defineConfig } from "drizzle-kit";

/**
 * Migrations: `npm run db:generate` writes SQL to ./drizzle, `npm run db:migrate` applies it.
 * Prefer the unpooled connection string for DDL when the integration provides one.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/solar/server/database/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "",
  },
});
