// Deliberate, additive collection import. Dry-run by default; --apply writes atomically.
import { config } from 'dotenv';
import { createClient } from '@libsql/client';
import { readFile, access } from 'node:fs/promises';

config({ path: '.env.local', quiet: true });
const manifest = JSON.parse(await readFile('src/db/data/ex250-1992.json', 'utf8'));
const apply = process.argv.includes('--apply');
const url = process.env.TRAIN_IMPORT_URL || process.env.TURSO_DATABASE_URL;
if (!url) throw new Error('Set TRAIN_IMPORT_URL or configure Turso deliberately.');
const client = createClient({ url, authToken: url.startsWith('file:') ? undefined : process.env.TURSO_AUTH_TOKEN });
const mapping = JSON.parse(await readFile('src/lib/enhanced-vehicle-images.json', 'utf8'));
for (const item of manifest.vehicles) {
  await access(`public${item.imagePath}`);
  if (!mapping[item.imagePath]) throw new Error(`Missing enhanced image: ${item.key}`);
  await access(`public${mapping[item.imagePath]}`);
}
const tx = await client.transaction(apply ? 'write' : 'read');
const rows = async (sql, args = []) => (await tx.execute({ sql, args })).rows;
const insert = async (table, data) => {
  const keys = Object.keys(data);
  const result = await tx.execute({
    sql: `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')}) RETURNING id`,
    args: Object.values(data),
  });
  return Number(result.rows[0].id);
};
try {
  const previous = await rows('SELECT * FROM trains WHERE number = ? AND era = ?', [manifest.train.number, manifest.train.era]);
  if (previous.length) {
    if (previous.length !== 1 || previous[0].category !== manifest.train.category || previous[0].name !== manifest.train.name || !previous[0].notes?.includes(manifest.sourceUrl)) {
      throw new Error('Existing train conflicts with this import; review it manually.');
    }
    const composition = await rows('SELECT tv.position, v.designation, v.operator, v.image_path FROM train_vehicles tv JOIN vehicles v ON v.id = tv.vehicle_id WHERE tv.train_id = ? ORDER BY tv.position', [previous[0].id]);
    if (composition.length !== manifest.formation.length || composition.some((row, index) => {
      const position = manifest.formation[index];
      const item = manifest.vehicles.find(v => v.key === position.key);
      return row.position !== position.position || row.designation !== item.designation || row.operator !== item.operator || row.image_path !== item.imagePath;
    })) throw new Error('Existing composition differs; refusing to duplicate or overwrite it.');
    console.log(JSON.stringify({ status: 'already imported', trainId: previous[0].id, positions: composition.length }));
  } else {
    const catalogs = new Map();
    let newCatalogs = 0, newImages = 0, newVehicles = 0;
    const now = new Date().toISOString();
    for (const item of manifest.vehicles) {
      let catalog;
      if (item.catalogId) {
        [catalog] = await rows('SELECT * FROM vehicle_catalog WHERE id = ?', [item.catalogId]);
        const [image] = await rows('SELECT * FROM catalog_images WHERE id = ? AND catalog_id = ?', [item.catalogImageId, item.catalogId]);
        if (!catalog || catalog.designation !== item.designation || !['ČSD', 'ČSD/ČD'].includes(catalog.operator) || image?.image_path !== item.imagePath) throw new Error(`Existing catalog mismatch: ${item.key}`);
        catalogs.set(item.key, { id: catalog.id, imageId: image.id });
        continue;
      }
      const matches = await rows('SELECT * FROM vehicle_catalog WHERE operator = ? AND full_designation = ? AND type = ?', [item.operator, item.designation, item.type]);
      if (matches.length > 1) throw new Error(`Ambiguous catalog match: ${item.key}`);
      [catalog] = matches;
      let id = catalog?.id;
      if (!catalog) {
        newCatalogs++;
        if (apply) id = await insert('vehicle_catalog', {
          designation: item.designation, full_designation: item.designation,
          operator: item.operator, wagon_family: `${item.operator}_historical`, type: item.type,
          class_type: item.classType, image_path: item.imagePath, image_width: item.width,
          image_height: item.height, source_url: manifest.sourceUrl, scraped_at: now,
        });
      }
      const images = id ? await rows('SELECT * FROM catalog_images WHERE catalog_id = ? ORDER BY sort_order', [id]) : [];
      let imageId = images.find(image => image.image_path === item.imagePath)?.id;
      if (!imageId) {
        newImages++;
        if (apply) imageId = await insert('catalog_images', {
          catalog_id: id, image_path: item.imagePath, image_width: item.width, image_height: item.height,
          source_url: item.sourceUrl, label: 'Ex 250, GVD 1991/1992', sort_order: images.length ? Math.max(...images.map(i => i.sort_order)) + 1 : 0,
        });
      }
      catalogs.set(item.key, { id, imageId });
    }
    // Match exact period/operator/livery only. Never repurpose a differently painted owned model.
    const available = await rows('SELECT * FROM vehicles WHERE is_template = 0 ORDER BY id');
    const used = new Set();
    let trainId;
    if (apply) trainId = await insert('trains', { ...manifest.train, created_at: now });
    const composition = [];
    for (const position of manifest.formation) {
      const item = manifest.vehicles.find(v => v.key === position.key);
      const existing = available.find(v => !used.has(v.id) && v.operator === item.operator && v.designation === item.designation && v.image_path === item.imagePath);
      let vehicleId = existing?.id;
      if (existing) used.add(existing.id);
      else {
        newVehicles++;
        if (apply) vehicleId = await insert('vehicles', {
          designation: item.designation, operator: item.operator, type: item.type, class_type: item.classType,
          image_path: item.imagePath, image_width: item.width, image_height: item.height,
          catalog_id: catalogs.get(item.key).id, catalog_image_id: catalogs.get(item.key).imageId,
          is_template: 0, notes: [item.notes, `Ex 250 Západní expres (1991/1992): ${position.notes}`, `Zdroj: ${manifest.sourceUrl}`].filter(Boolean).join('\n\n'),
          created_at: now,
        });
      }
      if (apply) await insert('train_vehicles', {
        train_id: trainId, vehicle_id: vehicleId, position: position.position,
        notes: position.number ? `Číslo vozu: ${position.number}` : position.notes || null,
      });
      composition.push({ position: position.position, vehicleId, key: position.key, reused: !!existing });
    }
    console.log(JSON.stringify({ status: apply ? 'created' : 'dry run', trainId, newCatalogs, newImages, newVehicles, composition }, null, 2));
  }
  if (apply) await tx.commit();
  else await tx.rollback();
} catch (error) {
  await tx.rollback();
  throw error;
} finally {
  tx.close();
  client.close();
}
