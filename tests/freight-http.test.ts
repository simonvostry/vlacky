import { parse } from "node-html-parser";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import Database from "better-sqlite3";
import test from "node:test";
import { encode } from "next-auth/jwt";


test("freight migration, separate collections, shared locomotives and preservation", { timeout: 90_000 }, async () => {
  const directory = mkdtempSync(join(tmpdir(), "vlacky-freight-"));
  const path = join(directory, "test.db");
  const sqlite = new Database(path);
  sqlite.exec(`CREATE TABLE vehicles (id INTEGER PRIMARY KEY, designation TEXT NOT NULL, operator TEXT, type TEXT NOT NULL, class_type TEXT, image_path TEXT, image_width INTEGER, image_height INTEGER, manufacturer TEXT, catalog_number TEXT, catalog_id INTEGER, catalog_image_id INTEGER, dcc_address INTEGER, is_template INTEGER NOT NULL DEFAULT 0, notes TEXT, created_at TEXT NOT NULL DEFAULT '2026-09-05');
    CREATE TABLE trains (id INTEGER PRIMARY KEY, number TEXT, name TEXT, category TEXT, route TEXT, era TEXT, notes TEXT, created_at TEXT);
    CREATE TABLE train_vehicles (id INTEGER PRIMARY KEY, train_id INTEGER REFERENCES trains(id), vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE, position INTEGER, dcc_address_override INTEGER, lighting_decoder_address INTEGER, notes TEXT);
    CREATE TABLE decoder_functions (id INTEGER PRIMARY KEY, vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE, function_number INTEGER NOT NULL, label TEXT NOT NULL, description TEXT);
    INSERT INTO vehicles (id, designation, type, dcc_address) VALUES (1, 'Test locomotive', 'loco', 3), (2, 'Test wagon', 'wagon', NULL);
    INSERT INTO decoder_functions (vehicle_id, function_number, label) VALUES (1, 0, 'Legacy lights');
    INSERT INTO trains (id, number) VALUES (1, '123');
    INSERT INTO train_vehicles (id, train_id, vehicle_id, position) VALUES (1, 1, 2, 1);
    CREATE TABLE vehicle_catalog (id INTEGER PRIMARY KEY, designation TEXT NOT NULL, code TEXT, full_designation TEXT NOT NULL, operator TEXT NOT NULL, wagon_family TEXT NOT NULL, type TEXT NOT NULL, class_type TEXT, uic_number TEXT, inventory_range TEXT, year_built TEXT, manufacturer TEXT, year_reconstructed TEXT, reconstructor TEXT, units_built TEXT, units_in_service TEXT, year_retired TEXT, max_speed TEXT, vehicle_code TEXT, image_path TEXT, image_width INTEGER, image_height INTEGER, source_url TEXT, scraped_at TEXT NOT NULL);
    CREATE TABLE catalog_images (id INTEGER PRIMARY KEY, catalog_id INTEGER REFERENCES vehicle_catalog(id), image_path TEXT NOT NULL, image_width INTEGER, image_height INTEGER, source_url TEXT, label TEXT, sort_order INTEGER NOT NULL);
    INSERT INTO vehicle_catalog (id, designation, full_designation, operator, wagon_family, type, scraped_at) VALUES (1, 'Catalog passenger', 'Catalog passenger', 'Test', 'test', 'wagon', '2026-09-26');
    INSERT INTO catalog_images VALUES (1, 1, '/img/test.gif', 100, 20, NULL, NULL, 0);
    UPDATE vehicles SET catalog_id=1, catalog_image_id=1 WHERE id=2;`);
  const url = `file:${path}`;
  const before = Object.fromEntries(['vehicles', 'trains', 'vehicle_catalog', 'train_vehicles', 'decoder_functions'].map(t => [t, sqlite.prepare(`SELECT * FROM ${t}`).all()]));
  const migrate = () => execFileSync(process.execPath, ['scripts/migrate-freight.mjs'], { env: { ...process.env, FREIGHT_MIGRATION_URL: url } });
  migrate(); migrate();
  for (const [table, rows] of Object.entries(before)) {
    const after = sqlite.prepare(`SELECT * FROM ${table}`).all().map((r) => {
      const row = r as Record<string, unknown>;
      delete row.wagon_kind; delete row.kind; return row;
    });
    assert.deepEqual(after, rows);
  }
  assert.equal((sqlite.prepare('SELECT wagon_kind FROM vehicles WHERE id=2').get() as {wagon_kind:string}).wagon_kind, 'passenger');
  for (const name of ['decoders', 'speed-profiles']) execFileSync(process.execPath, [`scripts/migrate-${name}.mjs`], { env: { ...process.env, DECODER_MIGRATION_URL: url, SPEED_PROFILE_MIGRATION_URL: url } });
  sqlite.exec(`INSERT INTO vehicle_catalog (id, designation, full_designation, operator, wagon_family, type, wagon_kind, scraped_at) VALUES (2, 'Catalog freight', 'Catalog freight', 'Test', 'freight', 'wagon', 'freight', '2026-09-26');
    INSERT INTO catalog_images VALUES (2, 2, '/img/test.gif', 100, 20, NULL, NULL, 0);`);
  const origin = 'http://localhost:3113';
  const secret = randomBytes(48).toString('base64url');
  const owner = 'freight-test@example.com';
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3113'], { env: { ...process.env, NODE_ENV: 'production', AUTH_SECRET: secret, AUTH_ALLOWED_EMAIL: owner, AUTH_GOOGLE_ID: 'test', AUTH_GOOGLE_SECRET: 'test', AUTH_URL: origin, AUTH_TRUST_HOST: 'true', TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: 'test-only', VLACKY_MCP_TOKEN: secret }, stdio: 'pipe' });
  let logs = ''; server.stdout.on('data', c => { logs += c; }); server.stderr.on('data', c => { logs += c; });
  const salt = 'authjs.session-token';
  const token = await encode({ secret, salt, token: { sub: 'test', email: owner, googleEmailVerified: true } });
  const headers = { cookie: `${salt}=${token}`, 'Content-Type': 'application/json' };
  const request = (path: string, options: RequestInit = {}) => fetch(origin + path, { headers, ...options });
  const save = (path:string, body:unknown, method='POST') => request(path, {method, body:JSON.stringify(body)});
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw new Error(logs);
      try { ready = (await request('/prihlaseni', { headers: {} })).status === 200; } catch {}
      if (ready) break;
      await delay(200);
    }
    assert.ok(ready, logs);
    const wagonResponse = await save('/api/vozidla', {designation:'Freight test Eanos', type:'wagon', wagonKind:'freight', dccAddress:55});
    assert.equal(wagonResponse.status,201,logs);
    const wagon = await wagonResponse.json();
    assert.equal(wagon.isTemplate,false);
    assert.equal(wagon.wagonKind,'freight');
    const trainResponse = await save('/api/vlaky', {name:'Freight test train', kind:'freight'});
    assert.equal(trainResponse.status,201);
    const train = await trainResponse.json();
    for (const vehicleId of [1,wagon.id]) assert.equal((await save(`/api/vlaky/${train.id}/vozidla`, {vehicleId})).status,201);
    const passengerHtml = await (await request('/vozy')).text();
    const freightHtml = await (await request('/nakladni-vozy')).text();
    assert.ok(passengerHtml.includes('Test wagon')); assert.ok(!passengerHtml.includes('Freight test Eanos'));
    assert.ok(freightHtml.includes('Freight test Eanos')); assert.ok(!freightHtml.includes('Test wagon'));
    assert.ok(!(await (await request('/soupravy?druh=passenger')).text()).includes('Freight test train'));
    assert.ok((await (await request('/soupravy?druh=freight')).text()).includes('Freight test train'));
    for (const page of ['/nakladni-vozy/novy', `/nakladni-vozy/${wagon.id}`, `/nakladni-vozy/${wagon.id}/upravit`, `/soupravy/${train.id}`, '/katalog?typ=freight', '/soupravy/novy?druh=freight', '/dcc']) {
      const response = await request(page); assert.equal(response.status,200,`${page}\n${logs}`);
    }
    const freightCatalog = await (await request('/katalog?typ=freight')).text();
    assert.ok(freightCatalog.includes('Catalog freight')); assert.ok(!freightCatalog.includes('Catalog passenger'));
    const catalogDetail = parse(await (await request('/katalog/2')).text());
    const addLink = catalogDetail.querySelector('a[href^="/nakladni-vozy/novy?"]')!;
    assert.ok(addLink);
    const catalogForm = parse(await (await request(addLink.getAttribute('href')!)).text());
    assert.equal(catalogForm.querySelector('#vehicle-type option[selected]')?.getAttribute('value'),'freight');
    assert.equal((await request(`/vozy/${wagon.id}`, {redirect:'manual'})).status,307);
    const manager = await (await request(`/soupravy/${train.id}`)).text();
    const picker = parse(manager).querySelector('select[aria-label="Vozidlo k přidání do soupravy"]')!;
    assert.ok(picker.text.includes('Test locomotive')); assert.ok(picker.text.includes('Freight test Eanos')); assert.ok(!picker.text.includes('Test wagon'));
    assert.equal((await save('/api/vozidla', {designation:'Invalid', type:'wagon', wagonKind:'wrong'})).status,400);
    assert.equal((await save('/api/vlaky', {kind:'wrong'})).status,400);
    assert.equal((await save(`/api/vozidla/${wagon.id}`, {...wagon,wagonKind:null},'PUT')).status,400);
    // Legacy clients omitting classification must not move freight back to passenger.
    const {wagonKind: omittedKind, ...legacyWagon} = wagon; void omittedKind;
    const updated = await (await save(`/api/vozidla/${wagon.id}`,legacyWagon,'PUT')).json();
    assert.equal(updated.wagonKind,'freight');
    const oldWagon = await (await request('/api/vozidla/2')).json();
    const {catalogId: omittedCatalog, catalogImageId: omittedImage, ...legacyEdit} = oldWagon; void omittedCatalog; void omittedImage;
    const preserved = await (await save('/api/vozidla/2',legacyEdit,'PUT')).json();
    assert.equal(preserved.catalogId,1); assert.equal(preserved.catalogImageId,1);
    assert.equal((await (await save(`/api/vlaky/${train.id}`,{name:train.name},'PUT')).json()).kind,'freight');
    const snapshot = await (await request('/api/integrations/v1/snapshot', {headers:{authorization:`Bearer ${secret}`}})).json();
    assert.equal(snapshot.schemaVersion,'1.2');
    assert.equal(snapshot.vehicles.find((v:{id:number})=>v.id===wagon.id).wagonKind,'freight');
    assert.equal(snapshot.vehicles.find((v:{id:number})=>v.id===1).wagonKind,null);
    assert.equal(snapshot.trains.find((t:{id:number})=>t.id===train.id).kind,'freight');
    assert.equal((sqlite.prepare("SELECT COUNT(*) AS n FROM vehicles WHERE type='loco'").get() as {n:number}).n,1);
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM decoder_functions WHERE vehicle_id=1').get() as {n:number}).n,1);
  } finally {
    server.kill('SIGTERM');
    await new Promise<void>(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', () => resolve()); });
    sqlite.close(); rmSync(directory, {recursive:true,force:true});
  }
});
