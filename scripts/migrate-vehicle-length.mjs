import { config } from 'dotenv';
import { createClient } from '@libsql/client';
config({ path: '.env.local', quiet: true });
const url = process.env.VEHICLE_LENGTH_MIGRATION_URL || process.env.TURSO_DATABASE_URL || 'file:data/vlacky.db';
const client = createClient({ url, authToken: url.startsWith('file:') ? undefined : process.env.TURSO_AUTH_TOKEN });
const tx = await client.transaction('write');
try {
  const columns = new Set((await tx.execute('PRAGMA table_info(vehicles)')).rows.map(r => r.name));
  if (!columns.has('length_over_buffers_mm')) {
    await tx.execute(`ALTER TABLE vehicles ADD COLUMN length_over_buffers_mm REAL
      CHECK (length_over_buffers_mm IS NULL OR (typeof(length_over_buffers_mm) IN ('real','integer') AND length_over_buffers_mm > 0 AND length_over_buffers_mm <= 10000))`);
  }
  await tx.commit();
  console.log('Vehicle length field ready; unknown values remain null. No description parsing or other data changes.');
} catch (error) { await tx.rollback(); throw error; }
finally { tx.close(); client.close(); }
