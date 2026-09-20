import { createClient } from '@libsql/client';
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local', quiet: true});
const url = process.env.DECODER_MIGRATION_URL || process.env.TURSO_DATABASE_URL;
if (!url) throw new Error('Set DECODER_MIGRATION_URL for local SQLite or configure Turso.');
const db = createClient({url, authToken: url.startsWith('file:') ? undefined : process.env.TURSO_AUTH_TOKEN});
const tx = await db.transaction('write');
try {
  // Never silently discard train-specific settings if a different installation has them.
  const legacy = await tx.execute('SELECT COUNT(*) AS n FROM train_vehicles WHERE dcc_address_override IS NOT NULL OR lighting_decoder_address IS NOT NULL');
  if (Number(legacy.rows[0].n)) throw new Error('Train-specific DCC values exist; migrate them per vehicle before continuing.');
  for (const sql of readFileSync(new URL('./decoder-migration.sql', import.meta.url), 'utf8').split(';').filter(s => s.trim())) await tx.execute(sql);
  const columns = (await tx.execute('PRAGMA table_info(decoder_functions)')).rows.map(r => r.name);
  if (!columns.includes('decoder_id')) await tx.execute('ALTER TABLE decoder_functions ADD COLUMN decoder_id TEXT REFERENCES vehicle_decoders(id) ON DELETE CASCADE');
  if (!columns.includes('category')) await tx.execute("ALTER TABLE decoder_functions ADD COLUMN category TEXT NOT NULL DEFAULT 'other'");
  if (!columns.includes('behavior')) await tx.execute("ALTER TABLE decoder_functions ADD COLUMN behavior TEXT NOT NULL DEFAULT 'toggle'");
  await tx.execute(`INSERT OR IGNORE INTO vehicle_decoders (id, vehicle_id, name)
    SELECT 'legacy-' || id, id, 'Hlavní dekodér' FROM vehicles
    WHERE (dcc_address IS NOT NULL OR id IN (SELECT vehicle_id FROM decoder_functions WHERE decoder_id IS NULL))
    AND NOT EXISTS (SELECT 1 FROM vehicle_decoders d WHERE d.vehicle_id = vehicles.id)`);
  await tx.execute(`UPDATE decoder_functions SET decoder_id = (SELECT id FROM vehicle_decoders WHERE vehicle_id = decoder_functions.vehicle_id ORDER BY sort_order LIMIT 1) WHERE decoder_id IS NULL`);
  await tx.execute('CREATE INDEX IF NOT EXISTS decoder_functions_decoder_idx ON decoder_functions(decoder_id)');
  await tx.commit();
  console.log('Decoder migration complete; existing vehicle addresses and functions preserved.');
} catch (e) { await tx.rollback(); throw e; }
finally { tx.close(); db.close(); }
