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
import { fixture } from "./speed-profile-fixture";

test("speed profile CRUD is authenticated, latest-only, lossless and concurrency-safe", { timeout: 90_000 }, async () => {
  const directory = mkdtempSync(join(tmpdir(), "vlacky-speed-"));
  const path = join(directory, "test.db");
  const sqlite = new Database(path);
  sqlite.exec(`CREATE TABLE vehicles (id INTEGER PRIMARY KEY, designation TEXT NOT NULL, operator TEXT, type TEXT NOT NULL, class_type TEXT, image_path TEXT, image_width INTEGER, image_height INTEGER, manufacturer TEXT, catalog_number TEXT, catalog_id INTEGER, catalog_image_id INTEGER, dcc_address INTEGER, is_template INTEGER NOT NULL DEFAULT 0, notes TEXT, created_at TEXT NOT NULL DEFAULT '2026-09-05');
    CREATE TABLE trains (id INTEGER PRIMARY KEY, number TEXT, name TEXT, category TEXT, route TEXT, era TEXT, notes TEXT, created_at TEXT);
    CREATE TABLE train_vehicles (id INTEGER PRIMARY KEY, train_id INTEGER REFERENCES trains(id), vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE, position INTEGER, dcc_address_override INTEGER, lighting_decoder_address INTEGER, notes TEXT);
    CREATE TABLE decoder_functions (id INTEGER PRIMARY KEY, vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE, function_number INTEGER NOT NULL, label TEXT NOT NULL, description TEXT);
    INSERT INTO vehicles (id, designation, type, dcc_address) VALUES (1, 'Test locomotive', 'loco', 3), (2, 'Test wagon', 'wagon', NULL);
    INSERT INTO decoder_functions (vehicle_id, function_number, label) VALUES (1, 0, 'Legacy lights');
    INSERT INTO trains (id, number) VALUES (1, '123');
    INSERT INTO train_vehicles (id, train_id, vehicle_id, position) VALUES (1, 1, 2, 1);`);
  const url = `file:${path}`;
  const migrate = () => execFileSync(process.execPath, ['scripts/migrate-decoders.mjs'], { env: { ...process.env, DECODER_MIGRATION_URL: url } });
  migrate(); migrate();
  assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM vehicle_decoders').get() as {n: number}).n, 1);
  assert.equal((sqlite.prepare('SELECT decoder_id FROM decoder_functions').get() as {decoder_id: string}).decoder_id, 'legacy-1');
  execFileSync(process.execPath, ['scripts/migrate-speed-profiles.mjs'], { env: { ...process.env, SPEED_PROFILE_MIGRATION_URL: url } });
  execFileSync(process.execPath, ['scripts/migrate-speed-profiles.mjs'], { env: { ...process.env, SPEED_PROFILE_MIGRATION_URL: url } });
  const origin = 'http://localhost:3110';
  const secret = randomBytes(48).toString('base64url');
  const owner = 'decoder-test@example.com';
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3110'], { env: { ...process.env, NODE_ENV: 'production', AUTH_SECRET: secret, AUTH_ALLOWED_EMAIL: owner, AUTH_GOOGLE_ID: 'test', AUTH_GOOGLE_SECRET: 'test', AUTH_URL: origin, AUTH_TRUST_HOST: 'true', TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: 'test-only' }, stdio: 'pipe' });
  let logs = ''; server.stdout.on('data', c => { logs += c; }); server.stderr.on('data', c => { logs += c; });
  const salt = 'authjs.session-token';
  const token = await encode({ secret, salt, token: { sub: 'test', email: owner, googleEmailVerified: true } });
  const headers = { cookie: `${salt}=${token}`, 'Content-Type': 'application/json' };
  const request = (path: string, options: RequestInit = {}) => fetch(origin + path, { headers, ...options });
  const save = (id: number, body: unknown) => request(`/api/vozidla/${id}/rychlostni-profil`, { method: 'PUT', headers, body: JSON.stringify(body) });
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw new Error(logs);
      try { ready = (await request('/prihlaseni', { headers: {} })).status === 200; } catch {}
      if (ready) break;
      await delay(200);
    }
    assert.ok(ready, logs);
    const endpoint = '/api/vozidla/1/rychlostni-profil';
    assert.equal((await request(endpoint, { headers: {} })).status, 401);
    assert.equal((await request(endpoint, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({profile:fixture,expectedUpdatedAt:null}) })).status,401);
    assert.equal((await request('/api/vozidla/999/rychlostni-profil')).status,404);
    assert.equal((await request('/api/vozidla/2/rychlostni-profil')).status,404);
    assert.equal(await (await request(endpoint)).json(),null);
    const beforeVehicle=sqlite.prepare('SELECT * FROM vehicles WHERE id=1').get();
    const beforeDecoders=sqlite.prepare('SELECT * FROM vehicle_decoders').all();
    const first=await save(1,{profile:fixture,expectedUpdatedAt:null}); assert.equal(first.status,200);
    const saved=await first.json(); assert.equal(saved.profile.measuredOn,'2026-09-19'); assert.equal(saved.profile.points[0].reverseKmh,2.1289992);
    assert.equal((await save(1,{profile:fixture,expectedUpdatedAt:null})).status,409);
    const next=await save(1,{profile:{...fixture,measuredOn:'2026-09-20',notes:'Replacement'},expectedUpdatedAt:saved.updatedAt}); assert.equal(next.status,200);
    assert.equal((await save(1,{profile:fixture,expectedUpdatedAt:saved.updatedAt})).status,409);
    const latest=await (await request(endpoint)).json(); assert.equal(latest.profile.notes,'Replacement');
    assert.equal((await save(1,{profile:{...fixture,points:[{step:29,forwardKmh:10,reverseKmh:10}]},expectedUpdatedAt:latest.updatedAt})).status,400);
    assert.equal((await save(1,{profile:fixture})).status,400);
    assert.equal((await save(1,{profile:{...fixture,source:{application:'iTrain',version:'6',locomotiveName:'Wrong',vehicleSourceId:'vlacky:vehicle:99',importedAt:null,projectSha256:null,rawSpeedControlXml:'',context:{}}},expectedUpdatedAt:latest.updatedAt})).status,400);
    assert.equal((await (await request(endpoint)).json()).updatedAt,latest.updatedAt);
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM vehicle_speed_profiles').get() as {n:number}).n,1);
    assert.deepEqual(sqlite.prepare('SELECT * FROM vehicles WHERE id=1').get(),beforeVehicle);
    assert.deepEqual(sqlite.prepare('SELECT * FROM vehicle_decoders').all(),beforeDecoders);
    const page=await request('/lokomotivy/1'); assert.equal(page.status,200,logs); assert.ok((await page.text()).includes('Rychlostní profil'));
  } finally {
    server.kill('SIGTERM');
    await new Promise<void>(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', () => resolve()); });
    sqlite.close(); rmSync(directory, { recursive: true, force: true });
  }
});
