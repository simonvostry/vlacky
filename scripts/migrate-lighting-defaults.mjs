// Normalize the old nullable lighting flag without rebuilding vehicles or its foreign keys.
import { config } from 'dotenv';
import { createClient } from '@libsql/client';
config({ path: '.env.local', quiet: true });
const url = process.env.LIGHTING_MIGRATION_URL || process.env.TURSO_DATABASE_URL || 'file:data/vlacky.db';
const client = createClient({ url, authToken: url.startsWith('file:') ? undefined : process.env.TURSO_AUTH_TOKEN });
const tx = await client.transaction('write');
try {
  await tx.execute('UPDATE vehicles SET has_lights = 0 WHERE has_lights IS NULL');
  // Existing SQLite installations cannot alter a column default in place. These
  // triggers also cover old importers that omit the field or explicitly send NULL.
  await tx.execute(`CREATE TRIGGER IF NOT EXISTS vehicles_lights_default_insert AFTER INSERT ON vehicles
    WHEN NEW.has_lights IS NULL BEGIN UPDATE vehicles SET has_lights = 0 WHERE id = NEW.id; END`);
  await tx.execute(`CREATE TRIGGER IF NOT EXISTS vehicles_lights_default_update AFTER UPDATE OF has_lights ON vehicles
    WHEN NEW.has_lights IS NULL BEGIN UPDATE vehicles SET has_lights = 0 WHERE id = NEW.id; END`);
  await tx.commit();
  console.log('Lighting defaults to No; existing Yes values and other vehicle data preserved.');
} catch (error) { await tx.rollback(); throw error; }
finally { tx.close(); client.close(); }
