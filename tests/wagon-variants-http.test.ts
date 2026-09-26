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


test("wagon variants preserve identities, equipment and safe quantity allocation", { timeout: 90_000 }, async () => {
  const directory = mkdtempSync(join(tmpdir(), "vlacky-variants-"));
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
  for (let id=10;id<19;id++) sqlite.prepare("INSERT INTO vehicles (id,designation,type,wagon_kind,image_path,image_width,image_height,notes) VALUES (?,'Uacs','wagon','freight','/img/owned/test-uacs.png',145,42,?)").run(id,`Original piece ${id}`);
  sqlite.exec("INSERT INTO vehicles (id,designation,type,wagon_kind,image_path) VALUES (20,'Uacs','wagon','freight','/img/red.png'),(21,'Uacs','wagon','freight','/img/green.png'); UPDATE vehicles SET dcc_address=44 WHERE id=11;");
  sqlite.exec("INSERT INTO train_vehicles (train_id,vehicle_id,position) VALUES (1,10,2)");
  const originalPieces = sqlite.prepare('SELECT * FROM vehicles ORDER BY id').all();
  execFileSync(process.execPath, ['scripts/migrate-wagon-variants.mjs'], { env: { ...process.env, WAGON_VARIANTS_MIGRATION_URL: url } });
  const grouped = sqlite.prepare('SELECT * FROM vehicles ORDER BY id').all();
  execFileSync(process.execPath, ['scripts/migrate-wagon-variants.mjs'], { env: { ...process.env, WAGON_VARIANTS_MIGRATION_URL: url } });
  assert.deepEqual(sqlite.prepare('SELECT * FROM vehicles ORDER BY id').all(),grouped);
  assert.deepEqual(grouped.map(r=>{const copy={...(r as Record<string,unknown>)};for(const key of ['wagon_variant_id','magnetic_couplers','has_lights','running_number']) delete copy[key];return copy;}),originalPieces);
  assert.equal((sqlite.prepare('SELECT count(DISTINCT wagon_variant_id) AS n FROM vehicles WHERE id BETWEEN 10 AND 18').get() as {n:number}).n,1);
  assert.equal((sqlite.prepare('SELECT count(DISTINCT wagon_variant_id) AS n FROM vehicles WHERE id IN (10,20,21)').get() as {n:number}).n,3);
  execFileSync(process.execPath, ['scripts/migrate-vehicle-equipment.mjs'], { env: { ...process.env, VEHICLE_EQUIPMENT_MIGRATION_URL: url } });
  const origin = 'http://localhost:3114';
  const secret = randomBytes(48).toString('base64url');
  const owner = 'freight-test@example.com';
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3114'], { env: { ...process.env, NODE_ENV: 'production', AUTH_SECRET: secret, AUTH_ALLOWED_EMAIL: owner, AUTH_GOOGLE_ID: 'test', AUTH_GOOGLE_SECRET: 'test', AUTH_URL: origin, AUTH_TRUST_HOST: 'true', TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: 'test-only', VLACKY_MCP_TOKEN: secret }, stdio: 'pipe' });
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
    const get = async (id:number) => (await request(`/api/vozidla/${id}`)).json();
    const a = await get(10);
    const variantId = a.wagonVariantId;
    assert.equal(a.magneticCouplers,null); assert.equal(a.hasLights,null);
    const gallery = parse(await (await request('/nakladni-vozy')).text());
    const tiles = gallery.querySelectorAll('a[href^="/nakladni-vozy/"]').filter(a=>/^\/nakladni-vozy\/\d+$/.test(a.getAttribute('href')!));
    assert.equal(tiles.length,3); assert.ok(tiles.some(a=>a.text.includes('9 ks')));
    const edit = await save('/api/vozidla/11',{magneticCouplers:true,hasLights:false,runningNumber:'My 11'},'PUT');
    assert.equal(edit.status,200); assert.equal((await get(11)).wagonVariantId,variantId);
    assert.equal((await get(11)).dccAddress,44); assert.equal((await get(10)).magneticCouplers,null);
    assert.equal((await save('/api/vozidla/11',{hasLights:'yes'},'PUT')).status,400);
    const flags = ['magneticCouplerA','magneticCouplerB','hasTailLights','hasSoundDecoder','hasSpeaker','isWeathered'];
    for (const key of flags) assert.equal(a[key],false);
    assert.equal((await get(11)).magneticCouplerA,true);assert.equal((await get(11)).magneticCouplerB,true); // legacy API compatibility
    assert.equal((await save('/api/vozidla/11',{editScope:'variant',magneticCouplerB:false,hasTailLights:true,hasSoundDecoder:false,hasSpeaker:true,isWeathered:true},'PUT')).status,200);
    const equipped=await get(11);
    assert.equal(equipped.magneticCouplerA,true);assert.equal(equipped.magneticCouplerB,false);assert.equal(equipped.magneticCouplers,null);
    assert.equal(equipped.hasSpeaker,true);assert.equal(equipped.hasSoundDecoder,false);assert.equal(equipped.wagonVariantId,variantId);
    for(const key of flags) assert.equal((await get(10))[key],false); // whole-variant scope must never copy physical equipment
    for(const key of flags) for(const invalid of [null,'yes',1]) assert.equal((await save('/api/vozidla/11',{[key]:invalid},'PUT')).status,400);
    await save('/api/vozidla/11',{notes:'Only notes changed'},'PUT');assert.equal((await get(11)).hasSpeaker,true);
    assert.equal((await save('/api/vozidla/1',{isWeathered:true},'PUT')).status,200);assert.equal((await get(1)).isWeathered,true);
    assert.equal((await get(1)).dccAddress,3);
    const resize = (body:unknown) => save(`/api/varianty-vozu/${variantId}`,body,'PUT');
    assert.equal((await resize({quantity:10,expectedQuantity:9})).status,200);
    const extra = sqlite.prepare('SELECT * FROM vehicles WHERE wagon_variant_id=? ORDER BY id DESC LIMIT 1').get(variantId) as {id:number;dcc_address:number|null;magnetic_couplers:number|null;notes:string|null};
    assert.equal(extra.dcc_address,null);assert.equal(extra.magnetic_couplers,null);assert.equal(extra.notes,null);
    for(const key of flags) assert.equal((await get(extra.id))[key],false);
    assert.equal((await resize({quantity:11,expectedQuantity:9})).status,409);
    assert.equal((await resize({quantity:9,expectedQuantity:10})).status,400);
    assert.equal((await resize({quantity:9,expectedQuantity:10,removeVehicleIds:[10]})).status,409);
    assert.equal((await request('/api/vozidla/10',{method:'DELETE'})).status,409);
    assert.equal((await resize({quantity:9,expectedQuantity:10,removeVehicleIds:[extra.id]})).status,200);
    assert.equal((await save('/api/vozidla/10',{imagePath:'/img/owned/uacs-improved.png',editScope:'variant'},'PUT')).status,200);
    assert.equal((await get(11)).imagePath,'/img/owned/uacs-improved.png');assert.equal((await get(10)).wagonVariantId,variantId);
    assert.equal((await save('/api/vozidla/18',{imagePath:'/img/owned/uacs-yellow-stripe.png'},'PUT')).status,200);
    assert.notEqual((await get(18)).wagonVariantId,variantId); assert.equal((await get(10)).imagePath,'/img/owned/uacs-improved.png');
    assert.equal((await get(18)).notes,'Original piece 18');
    const train = await (await save('/api/vlaky',{name:'Nine pieces',kind:'freight'})).json();
    const trainPath = `/api/vlaky/${train.id}/vozidla`;
    assert.equal((await save(trainPath,{variantId,quantity:2,vehicleIds:[11,12]})).status,201);
    assert.equal((await save(trainPath,{variantId,quantity:2,vehicleIds:[13,13]})).status,409);
    assert.equal((await save(trainPath,{vehicleId:11})).status,409);
    const parallel = await Promise.all([save(trainPath,{variantId,quantity:6}),save(trainPath,{variantId,quantity:6})]);
    assert.deepEqual(parallel.map(r=>r.status).sort(),[201,409],logs);
    const trainIds = sqlite.prepare('SELECT vehicle_id FROM train_vehicles WHERE train_id=? ORDER BY position').all(train.id) as {vehicle_id:number}[];
    assert.equal(trainIds.length,8);assert.equal(new Set(trainIds.map(r=>r.vehicle_id)).size,8);
    assert.equal((await save('/api/vlaky/1/vozidla',{vehicleId:11})).status,201); // alternate compositions allowed
    const assignment = sqlite.prepare('SELECT id FROM train_vehicles WHERE train_id=? LIMIT 1').get(train.id) as {id:number};
    assert.equal((await save('/api/vlaky/1/vozidla',{trainVehicleId:assignment.id},'DELETE')).status,404);
    assert.equal((await save('/api/vlaky/1/vozidla',{trainVehicleId:assignment.id,action:'move',direction:'up'},'PUT')).status,404);
    const made = await save('/api/vozidla',{designation:'Three new copies',type:'wagon',wagonKind:'passenger',imagePath:'/img/three.png',quantity:3,dccAddress:99,magneticCouplers:true,hasSoundDecoder:true,hasSpeaker:true,hasTailLights:true,isWeathered:true});
    assert.equal(made.status,201);const first = await made.json();
    const copies = sqlite.prepare('SELECT * FROM vehicles WHERE wagon_variant_id=? ORDER BY id').all(first.wagonVariantId) as {dcc_address:number|null;magnetic_couplers:number|null}[];
    assert.equal(copies.length,3);assert.equal(copies[0].dcc_address,99);assert.equal(copies[1].dcc_address,null);assert.equal(copies[1].magnetic_couplers,null);
    for(const key of ['hasSoundDecoder','hasSpeaker','hasTailLights','isWeathered']) assert.equal(first[key],true);
    const newIds=sqlite.prepare('SELECT id FROM vehicles WHERE wagon_variant_id=? ORDER BY id').all(first.wagonVariantId) as {id:number}[];
    for(const key of flags) assert.equal((await get(newIds[1].id))[key],false);
    const another = await (await save('/api/vozidla',{designation:'Three new copies',type:'wagon',wagonKind:'passenger',imagePath:'/img/three.png'})).json();
    assert.equal(another.wagonVariantId,first.wagonVariantId);
    const snapshot = await (await request('/api/integrations/v1/snapshot',{headers:{authorization:`Bearer ${secret}`}})).json();
    const exported = snapshot.vehicles.find((v:{id:number})=>v.id===11);
    assert.equal(exported.sourceId,'vlacky:vehicle:11');assert.equal(exported.referenceOnly.magneticCouplers,null);assert.equal(exported.referenceOnly.hasLights,false);assert.equal(exported.referenceOnly.wagonVariantId,variantId);
    for(const key of flags) assert.equal(exported.referenceOnly[key],(await get(11))[key]);
    assert.equal(exported.referenceOnly.hasLights,false); // general lighting is independent of red tail lights
    assert.equal(exported.referenceOnly.hasTailLights,true);
    assert.equal(snapshot.schemaVersion,'1.4');
    assert.equal((await request(`/api/varianty-vozu/${variantId}`,{method:'PUT',headers:{authorization:`Bearer ${secret}`},body:JSON.stringify({quantity:1,expectedQuantity:8})})).status,401);
    assert.equal((await request(`/nakladni-vozy/11`)).status,200);
    assert.ok(parse(await (await request(`/soupravy/${train.id}`)).text()).text.includes('0/8'));
  } finally {
    server.kill('SIGTERM');
    await new Promise<void>(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', () => resolve()); });
    sqlite.close(); rmSync(directory, {recursive:true,force:true});
  }
});
