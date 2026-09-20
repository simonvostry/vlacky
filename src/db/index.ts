import { config } from "dotenv";
import { createClient, type InStatement } from "@libsql/client";
import Database from "better-sqlite3";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import path from "node:path";
import fs from "node:fs";

import * as schema from "./schema";

config({ path: ".env.local", quiet: true });

// Use Turso (libSQL) when env vars are set, otherwise fall back to local SQLite
const useTurso = !!(
  process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN
);

type RawRow = Record<string, unknown>;
let atomicRead: (statements: string[]) => Promise<RawRow[][]>;
export async function readAtomic(statements: string[]) { return atomicRead(statements); }

let atomicWrite: (statements: InStatement[]) => Promise<void>;
export async function executeAtomic(statements: InStatement[]) { await atomicWrite(statements); }

// Keep schema inference while allowing either driver's sync/async results.
function createDb(): BaseSQLiteDatabase<"sync" | "async", unknown, typeof schema> {
  if (useTurso) {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    atomicRead = async statements => (await client.batch(statements, "read")).map(result => result.rows);
    atomicWrite = async statements => { await client.batch(statements, "write"); };
    return drizzleLibsql(client, { schema });
  } else {
    const DB_DIR = path.join(process.cwd(), "data");
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

    const DB_PATH = path.join(DB_DIR, "vlacky.db");
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    atomicRead = async statements => sqlite.transaction(() => statements.map(sql => sqlite.prepare(sql).all() as RawRow[]))();
    atomicWrite = async statements => {
      sqlite.transaction(() => {
        for (const statement of statements) {
          if (typeof statement === "string") sqlite.prepare(statement).run();
          else {
            if (!Array.isArray(statement.args)) throw new Error("Expected positional SQL arguments");
            sqlite.prepare(statement.sql).run(...statement.args);
          }
        }
      })();
    };
    return drizzleSqlite(sqlite, { schema });
  }
}

export const db = createDb();
export { schema };
