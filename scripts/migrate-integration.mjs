import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local', quiet: true});
const url = process.env.INTEGRATION_MIGRATION_URL || process.env.TURSO_DATABASE_URL;
if (!url) throw new Error('Configure a database URL.');
const client = createClient({url, authToken: url.startsWith('file:') ? undefined : process.env.TURSO_AUTH_TOKEN});
const tx = await client.transaction('write');
try {
  const columns = (await tx.execute('PRAGMA table_info(vehicles)')).rows.map(r => r.name);
  if (!columns.includes('is_template')) await tx.execute('ALTER TABLE vehicles ADD COLUMN is_template INTEGER NOT NULL DEFAULT 0');
  // Identify the exact sample created for this collection, never a real locomotive by class/name alone.
  await tx.execute({sql: "UPDATE vehicles SET is_template = 1 WHERE designation = ? AND notes LIKE ?", args: ['VZOR — V160 (světla a zvuk)', 'UKÁZKOVÝ ZÁZNAM pro inspiraci,%']});
  await tx.commit();
  console.log('Integration migration complete; sample explicitly marked as a template.');
} catch(e) { await tx.rollback(); throw e; }
finally { tx.close(); client.close(); }
