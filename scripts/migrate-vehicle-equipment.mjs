import { config } from 'dotenv';
import { createClient } from '@libsql/client';
config({ path: '.env.local', quiet: true });
const url = process.env.VEHICLE_EQUIPMENT_MIGRATION_URL || process.env.TURSO_DATABASE_URL || 'file:data/vlacky.db';
const client = createClient({ url, authToken: url.startsWith('file:') ? undefined : process.env.TURSO_AUTH_TOKEN });
const tx = await client.transaction('write');
try {
  const columns = new Set((await tx.execute('PRAGMA table_info(vehicles)')).rows.map(r => r.name));
  const fields = ['magnetic_coupler_a', 'magnetic_coupler_b', 'has_tail_lights', 'has_sound_decoder', 'has_speaker', 'is_weathered'];
  for (const name of fields) {
    if (columns.has(name)) continue;
    await tx.execute(`ALTER TABLE vehicles ADD COLUMN ${name} INTEGER NOT NULL DEFAULT 0 CHECK (${name} IN (0,1))`);
    // The old whole-vehicle flag applies to both ends. Only initialize newly added columns.
    if (name.startsWith('magnetic_coupler_') && columns.has('magnetic_couplers')) {
      await tx.execute(`UPDATE vehicles SET ${name} = COALESCE(magnetic_couplers, 0)`);
    }
  }
  await tx.commit();
  console.log('Vehicle equipment ready; existing identities, grouping and configuration preserved.');
} catch (error) { await tx.rollback(); throw error; }
finally { tx.close(); client.close(); }
