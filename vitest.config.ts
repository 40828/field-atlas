import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Engine tests run against a REAL Postgres engine (PGlite, WASM) using the production Drizzle
 * schema and migration SQL — not mocks of the database layer.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "server-only": path.resolve(__dirname, "tests/stubs/empty.ts"),
      "next/cache": path.resolve(__dirname, "tests/stubs/next-cache.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
