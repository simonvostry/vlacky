import { config } from "dotenv";
config({ path: ".env.local" });

import * as schema from "./schema";

// Use Turso (libSQL) when env vars are set, otherwise fall back to local SQLite
const useTurso = !!(
  process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN
);

function createDb() {
  if (useTurso) {
    const { createClient } = require("@libsql/client");
    const { drizzle } = require("drizzle-orm/libsql");

    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    return drizzle(client, { schema });
  } else {
    const Database = require("better-sqlite3");
    const { drizzle } = require("drizzle-orm/better-sqlite3");
    const path = require("path");
    const fs = require("fs");

    const DB_DIR = path.join(process.cwd(), "data");
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

    const DB_PATH = path.join(DB_DIR, "vlacky.db");
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    return drizzle(sqlite, { schema });
  }
}

export const db = createDb();
export { schema };
