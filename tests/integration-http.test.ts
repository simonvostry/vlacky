import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import Database from "better-sqlite3";
import test from "node:test";
import { fixture } from "./speed-profile-fixture";
import { hasIntegrationToken } from "../src/lib/integration-auth";

test("integration token fails closed and requires a dedicated bearer", () => {
  const old = process.env.VLACKY_MCP_TOKEN;
  try {
    delete process.env.VLACKY_MCP_TOKEN;
    assert.equal(hasIntegrationToken(new Request('https://example.com', {headers:{authorization:'Bearer arbitrary'}})), false);
    process.env.VLACKY_MCP_TOKEN = 'a'.repeat(48);
    assert.equal(hasIntegrationToken(new Request('https://example.com', {headers:{authorization:'Bearer '+ 'a'.repeat(48)}})), true);
    assert.equal(hasIntegrationToken(new Request('https://example.com', {headers:{authorization:'Bearer '+ 'b'.repeat(48)}})), false);
    assert.equal(hasIntegrationToken(new Request('https://example.com?token='+ 'a'.repeat(48))), false);
  } finally { if (old === undefined) delete process.env.VLACKY_MCP_TOKEN; else process.env.VLACKY_MCP_TOKEN = old; }
});

test("hosted MCP and image API export read-only collection with preservation contract", { timeout: 90_000 }, async () => {
  const directory = mkdtempSync(join(tmpdir(), 'vlacky-mcp-'));
  const file = join(directory, 'test.db');
  const sqlite = new Database(file);
  sqlite.exec(`CREATE TABLE vehicles (id INTEGER PRIMARY KEY, designation TEXT NOT NULL, operator TEXT, type TEXT NOT NULL, wagon_kind TEXT NOT NULL DEFAULT 'passenger', class_type TEXT, image_path TEXT, image_width INTEGER, image_height INTEGER, manufacturer TEXT, catalog_number TEXT, catalog_id INTEGER, catalog_image_id INTEGER, dcc_address INTEGER, notes TEXT, created_at TEXT NOT NULL DEFAULT '2026-09-05');
    CREATE TABLE trains (id INTEGER PRIMARY KEY, kind TEXT NOT NULL DEFAULT 'passenger', number TEXT, name TEXT, category TEXT, route TEXT, era TEXT, notes TEXT, created_at TEXT);
    CREATE TABLE train_vehicles (id INTEGER PRIMARY KEY, train_id INTEGER REFERENCES trains(id), vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE, position INTEGER, dcc_address_override INTEGER, lighting_decoder_address INTEGER, notes TEXT);
    CREATE TABLE decoder_functions (id INTEGER PRIMARY KEY, vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE, function_number INTEGER NOT NULL, label TEXT NOT NULL, description TEXT);
    INSERT INTO vehicles (id, designation, type, dcc_address, image_path) VALUES (1, 'Test locomotive', 'loco', 3, '/img/cd-bmee.gif'), (2, 'Test wagon', 'wagon', NULL, NULL);
    INSERT INTO vehicles (id, designation, type, notes) VALUES (3, 'VZOR — V160 (světla a zvuk)', 'loco', 'UKÁZKOVÝ ZÁZNAM pro inspiraci, nikoli vlastněný model.');
    INSERT INTO decoder_functions (vehicle_id, function_number, label) VALUES (1, 0, 'Lights');
    INSERT INTO trains (id, number, name) VALUES (1, '123', 'Test train'), (2, '999', 'Template train');
    INSERT INTO train_vehicles (id, train_id, vehicle_id, position) VALUES (1, 1, 2, 2), (2, 1, 1, 1), (3, 2, 3, 1);`);
  const url = `file:${file}`;
  execFileSync(process.execPath, ['scripts/migrate-decoders.mjs'], {env:{...process.env, DECODER_MIGRATION_URL:url}});
  const migrate = () => execFileSync(process.execPath, ['scripts/migrate-integration.mjs'], {env:{...process.env, INTEGRATION_MIGRATION_URL:url}});
  migrate(); migrate();
  assert.equal((sqlite.prepare('SELECT is_template FROM vehicles WHERE id=3').get() as {is_template:number}).is_template, 1);
  sqlite.prepare('UPDATE vehicle_decoders SET cvs=? WHERE vehicle_id=1').run(JSON.stringify([{number:3,value:10,cv31:null,cv32:null,note:'Reference only'}]));
  execFileSync(process.execPath, ['scripts/migrate-speed-profiles.mjs'], { env: { ...process.env, SPEED_PROFILE_MIGRATION_URL: url } });
  sqlite.prepare('INSERT INTO vehicle_speed_profiles (vehicle_id, profile, updated_at) VALUES (?, ?, ?)').run(1, JSON.stringify(fixture), 'fixture-token');
  execFileSync(process.execPath, ['scripts/migrate-wagon-variants.mjs'], { env: { ...process.env, WAGON_VARIANTS_MIGRATION_URL: url } });
  execFileSync(process.execPath, ['scripts/migrate-vehicle-equipment.mjs'], { env: { ...process.env, VEHICLE_EQUIPMENT_MIGRATION_URL: url } });
  execFileSync(process.execPath, ['scripts/migrate-lighting-defaults.mjs'], { env: { ...process.env, LIGHTING_MIGRATION_URL: url } });
  const origin = 'http://localhost:3109';
  const token = randomBytes(32).toString('base64url');
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3109'], {env:{...process.env, NODE_ENV:'production', AUTH_SECRET:randomBytes(48).toString('base64url'), AUTH_ALLOWED_EMAIL:'mcp-test@example.com', AUTH_GOOGLE_ID:'test', AUTH_GOOGLE_SECRET:'test', AUTH_URL:origin, AUTH_TRUST_HOST:'true', VLACKY_MCP_TOKEN:token, VLACKY_PUBLIC_URL:origin, TURSO_DATABASE_URL:url, TURSO_AUTH_TOKEN:'test-only'}, stdio:'pipe'});
  let logs=''; server.stdout.on('data', c=>{logs+=c;}); server.stderr.on('data', c=>{logs+=c;});
  const headers = {authorization:`Bearer ${token}`};
  const request = (path:string, options:RequestInit={}) => fetch(origin+path,{headers,redirect:'manual',...options});
  const rpc = async (method:string, params:unknown={}, extraHeaders:Record<string,string>={}) => {
    const response = await request('/api/mcp',{method:'POST',headers:{...headers,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-03-26',...extraHeaders},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
    const text=await response.text();
    assert.equal(response.status,200,`${method}: ${text}\n${logs}`);
    const payload = text.startsWith('event:') || text.startsWith('data:') ? JSON.parse(text.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join('')) : JSON.parse(text);
    assert.equal(payload.error,undefined,JSON.stringify(payload));
    return payload.result;
  };
  try {
    let ready=false;
    for(let i=0;i<100;i++){if(server.exitCode!==null)throw new Error(logs);try{ready=(await request('/prihlaseni',{headers:{}})).status===200;}catch{}if(ready)break;await delay(200);}
    assert.ok(ready,logs);
    for (const path of ['/api/mcp','/api/integrations/v1/snapshot','/api/integrations/v1/images/1?format=png']) {
      assert.equal((await request(path,{headers:{}})).status,401,path);
      assert.equal((await request(path,{headers:{authorization:'Bearer wrong'}})).status,401,path);
      assert.equal((await request(path+'?token='+token,{headers:{}})).status,401,path);
    }
    assert.equal((await request('/api/vozidla')).status,401,'MCP token must not grant normal CRUD access');
    assert.equal((await request('/img/cd-bmee.gif')).status,302,'MCP token must not bypass normal image login');
    assert.equal((await request('/api/integrations/v1/snapshot',{method:'POST'})).status,405);
    const before = JSON.stringify(sqlite.prepare('SELECT * FROM vehicles ORDER BY id').all());
    const snapshot = await (await request('/api/integrations/v1/snapshot')).json();
    assert.equal(snapshot.schemaVersion,'1.4');
    assert.deepEqual(snapshot.vehicles[0].referenceOnly.speedProfile,fixture);
    assert.ok(!snapshot.syncContract.allowedSourceFields.includes('referenceOnly.speedProfile'));
    assert.ok(snapshot.syncContract.speedProfiles.includes('never an automatically applied'));
    assert.equal((await request('/api/vozidla/1/rychlostni-profil',{method:'PUT',body:'{}'})).status,401);
    assert.equal(snapshot.vehicles.length,2); assert.equal(snapshot.trains.length,1); assert.equal(snapshot.excluded.trains.length,1);
    assert.equal(snapshot.vehicles[0].sourceId,'vlacky:vehicle:1');
    assert.deepEqual(snapshot.trains[0].composition.map((c:{vehicleSourceId:string})=>c.vehicleSourceId),['vlacky:vehicle:1','vlacky:vehicle:2']);
    assert.equal(snapshot.vehicles[0].decoders[0].referenceOnly.cvs[0].number,3);
    assert.ok(snapshot.syncContract.alwaysPreserveInITrain.some((s:string)=>s.includes('speed profiles')));
    assert.ok(snapshot.syncContract.alwaysPreserveInITrain.some((s:string)=>s.includes('Braking')));
    assert.ok(snapshot.syncContract.updates.includes('Never recreate/replace'));
    assert.ok(!snapshot.syncContract.allowedSourceFields.includes('referenceOnly.cvs'));
    const repeated=await (await request('/api/integrations/v1/snapshot')).json(); assert.equal(snapshot.revision,repeated.revision);
    const templates=await (await request('/api/integrations/v1/snapshot?includeTemplates=true')).json(); assert.equal(templates.vehicles.length,3); assert.equal(templates.vehicles[2].recordType,'template'); assert.equal(templates.trains.length,2);
    const original=await request('/api/integrations/v1/images/1'); const bytes=Buffer.from(await original.arrayBuffer());
    assert.deepEqual(bytes,readFileSync('public/img/cd-bmee.gif'));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),snapshot.vehicles[0].image.original.sha256);
    const png=await request('/api/integrations/v1/images/1?format=png'); const pngBytes=Buffer.from(await png.arrayBuffer());
    assert.equal(png.headers.get('content-type'),'image/png'); assert.equal(pngBytes.subarray(1,4).toString(),'PNG');
    assert.equal(createHash('sha256').update(pngBytes).digest('hex'),snapshot.vehicles[0].image.png.sha256);
    assert.equal((await request('/api/integrations/v1/images/2')).status,404);
    const initialized=await rpc('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'test',version:'1'}});
    assert.ok(initialized.instructions.includes('NEVER overwrite measured'));
    const tools=await rpc('tools/list'); assert.equal(tools.tools.length,7);
    for(const tool of tools.tools)assert.equal(tool.annotations.readOnlyHint,true);
    const call=async(name:string,args:unknown={})=>rpc('tools/call',{name,arguments:args});
    const rules=await call('get_sync_contract'); assert.ok(rules.structuredContent.syncContract.alwaysPreserveInITrain.length>=6);
    assert.equal((await call('list_vehicles')).structuredContent.vehicles.length,2);
    assert.equal((await call('get_vehicle',{id:3})).isError,true);
    assert.equal((await call('get_vehicle',{id:1})).structuredContent.vehicle.dccAddress,3);
    assert.equal((await call('get_train',{id:1})).structuredContent.vehicles.length,2);
    assert.equal((await call('get_vehicle_image',{id:1})).structuredContent.image.png.sha256,snapshot.vehicles[0].image.png.sha256);
    assert.equal((await call('get_collection_snapshot')).structuredContent.revision,snapshot.revision);
    assert.equal(JSON.stringify(sqlite.prepare('SELECT * FROM vehicles ORDER BY id').all()),before,'MCP reads never mutate collection');
    assert.equal((await request('/api/mcp',{method:'POST',headers:{...headers,Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'})).status,403);
    sqlite.prepare('UPDATE vehicles SET image_path=? WHERE id=1').run('/img/../../.env.local');
    assert.equal((await request('/api/integrations/v1/images/1')).status,404);
    const changed=await (await request('/api/integrations/v1/snapshot')).json(); assert.notEqual(changed.revision,snapshot.revision); assert.equal(changed.vehicles[0].image.status,'unavailable');
  } finally {server.kill('SIGTERM');await new Promise<void>(resolve=>{if(server.exitCode!==null)resolve();else server.once('exit',()=>resolve());});sqlite.close();rmSync(directory,{recursive:true,force:true});}
});
