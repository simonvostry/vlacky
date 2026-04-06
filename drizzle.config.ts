import { defineConfig } from "drizzle-kit";

const useTurso = !!(
  process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN
);

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: useTurso ? "turso" : "sqlite",
  dbCredentials: useTurso
    ? {
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
      }
    : {
        url: "./data/vlacky.db",
      },
});
