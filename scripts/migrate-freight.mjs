import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
const url = process.env.FREIGHT_MIGRATION_URL || process.env.TURSO_DATABASE_URL;
if (!url) throw new Error('Configure a database URL.');
const client = createClient({ url, authToken: url.startsWith('file:') ? undefined : process.env.TURSO_AUTH_TOKEN });
const tx = await client.transaction('write');
try {
  for (const [table, column] of [['vehicles', 'wagon_kind'], ['vehicle_catalog', 'wagon_kind'], ['trains', 'kind']]) {
    const columns = (await tx.execute(`PRAGMA table_info(${table})`)).rows.map(r => r.name);
    if (!columns.includes(column)) await tx.execute(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT NOT NULL DEFAULT 'passenger' CHECK (${column} IN ('passenger', 'freight'))`);
  }
  await tx.commit();
  console.log('Freight migration complete. Existing records retained as passenger.');
} catch (error) { await tx.rollback(); throw error; }
finally { tx.close(); client.close(); }
