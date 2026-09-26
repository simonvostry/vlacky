import { config } from 'dotenv';
import { createClient } from '@libsql/client';
config({ path: '.env.local', quiet: true });
const url = process.env.WAGON_VARIANTS_MIGRATION_URL || process.env.TURSO_DATABASE_URL || 'file:data/vlacky.db';
const client = createClient({ url, authToken: url.startsWith('file:') ? undefined : process.env.TURSO_AUTH_TOKEN });
const tx = await client.transaction('write');
try {
  await tx.execute('CREATE TABLE IF NOT EXISTS wagon_variants (id INTEGER PRIMARY KEY AUTOINCREMENT)');
  const columns = new Set((await tx.execute('PRAGMA table_info(vehicles)')).rows.map(r => r.name));
  for (const [name, definition] of Object.entries({
    wagon_variant_id: 'INTEGER REFERENCES wagon_variants(id)',
    magnetic_couplers: 'INTEGER CHECK (magnetic_couplers IN (0,1))',
    has_lights: 'INTEGER CHECK (has_lights IN (0,1))',
    running_number: 'TEXT',
  })) if (!columns.has(name)) await tx.execute(`ALTER TABLE vehicles ADD COLUMN ${name} ${definition}`);
  await tx.execute('CREATE INDEX IF NOT EXISTS vehicles_wagon_variant_idx ON vehicles(wagon_variant_id)');
  // Only ungrouped records are considered. A repeat never merges deliberately split variants.
  const rows = (await tx.execute("SELECT * FROM vehicles WHERE type = 'wagon' AND wagon_variant_id IS NULL ORDER BY id")).rows;
  const groups = new Map();
  const shared = ['designation','operator','wagon_kind','class_type','image_path','image_width','image_height','manufacturer','catalog_number','catalog_id','catalog_image_id','is_template'];
  for (const row of rows) {
    const key = row.image_path ? JSON.stringify(shared.map(k => row[k] ?? null)) : `unpictured:${row.id}`;
    const members = groups.get(key) ?? [];
    members.push(row.id);
    groups.set(key,members);
  }
  if (groups.size) {
    const variants = (await tx.execute(`INSERT INTO wagon_variants (id) VALUES ${[...groups].map(()=>'(NULL)').join(',')} RETURNING id`)).rows;
    const statements = [...groups.values()].flatMap((members,index)=>members.map(id=>({sql:'UPDATE vehicles SET wagon_variant_id = ? WHERE id = ?',args:[variants[index].id,id]})));
    await tx.batch(statements);
  }
  await tx.commit();
  console.log(`Wagon variants ready; grouped ${rows.length} previously ungrouped pieces into ${groups.size} variants.`);
} catch (error) { await tx.rollback(); throw error; }
finally { tx.close(); client.close(); }
