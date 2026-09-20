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
import { parseDccConfig } from "../src/lib/decoder-config";

const decoder = (id = "decoder-one") => ({ id, name: "Zvuk", manufacturer: "Test", model: "Model", address: null, soundProject: "Project", manualUrl: "https://example.com/manual", notes: "", functions: [{ functionNumber: 0, label: "Světla", category: "light", behavior: "toggle", description: "Čelní světla" }, { functionNumber: 2, label: "Houkačka", category: "sound", behavior: "momentary", description: "" }], cvs: [{ number: 259, value: 0, cv31: 16, cv32: 0, note: "Hlasitost" }] });
test("validates decoder functions, indexed CVs, addresses and manual URLs", () => {
  assert.equal(parseDccConfig({ dccAddress: 3, decoders: [decoder()] }).decoders[0].cvs[0].value, 0);
  for (const address of [0, -1, 10240, 1.5, "3"]) assert.throws(() => parseDccConfig({ dccAddress: address, decoders: [] }));
  const d = decoder();
  assert.throws(() => parseDccConfig({ dccAddress: null, decoders: [{ ...d, functions: [d.functions[0], d.functions[0]] }] }));
  assert.throws(() => parseDccConfig({ dccAddress: null, decoders: [{ ...d, manualUrl: "javascript:alert(1)" }] }));
  assert.throws(() => parseDccConfig({ dccAddress: null, decoders: [{ ...d, cvs: [{ ...d.cvs[0], cv32: null }] }] }));
  assert.throws(() => parseDccConfig({ dccAddress: null, decoders: [{ ...d, cvs: [d.cvs[0], d.cvs[0]] }] }));
  assert.throws(() => parseDccConfig({ dccAddress: null, decoders: [d, d] }));
});

test("migration and authenticated decoder CRUD preserve vehicle ownership and atomic saves", { timeout: 90_000 }, async () => {
  const directory = mkdtempSync(join(tmpdir(), "vlacky-decoders-"));
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
  const origin = 'http://localhost:3108';
  const secret = randomBytes(48).toString('base64url');
  const owner = 'decoder-test@example.com';
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3108'], { env: { ...process.env, NODE_ENV: 'production', AUTH_SECRET: secret, AUTH_ALLOWED_EMAIL: owner, AUTH_GOOGLE_ID: 'test', AUTH_GOOGLE_SECRET: 'test', AUTH_URL: origin, AUTH_TRUST_HOST: 'true', TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: 'test-only' }, stdio: 'pipe' });
  let logs = ''; server.stdout.on('data', c => { logs += c; }); server.stderr.on('data', c => { logs += c; });
  const salt = 'authjs.session-token';
  const token = await encode({ secret, salt, token: { sub: 'test', email: owner, googleEmailVerified: true } });
  const headers = { cookie: `${salt}=${token}`, 'Content-Type': 'application/json' };
  const request = (path: string, options: RequestInit = {}) => fetch(origin + path, { headers, ...options });
  const save = (id: number, body: unknown) => request(`/api/vozidla/${id}/dekodery`, { method: 'PUT', headers, body: JSON.stringify(body) });
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw new Error(logs);
      try { ready = (await request('/prihlaseni', { headers: {} })).status === 200; } catch {}
      if (ready) break;
      await delay(200);
    }
    assert.ok(ready, logs);
    assert.equal((await request('/api/vozidla/1/dekodery', { headers: {} })).status, 401);
    assert.equal((await request('/api/vozidla/999/dekodery')).status, 404);
    const original = await (await request('/api/vozidla/1/dekodery')).json();
    assert.equal(original.dccAddress, 3); assert.equal(original.decoders[0].functions[0].label, 'Legacy lights');
    const body = { dccAddress: 3, decoders: [decoder(), { ...decoder('decoder-two'), name: 'Osvětlení', address: 44 }] };
    assert.equal((await save(1, body)).status, 200);
    const saved = await (await request('/api/vozidla/1/dekodery')).json();
    assert.equal(saved.decoders.length, 2); assert.equal(saved.decoders[1].address, 44);
    assert.equal(saved.decoders[0].cvs[0].value, 0); assert.equal(saved.decoders[0].functions[1].behavior, 'momentary');
    assert.equal((await save(2, { dccAddress: 55, decoders: [{ ...decoder('wagon-light'), name: 'Interiér' }] })).status, 200);
    // Another vehicle cannot take an existing decoder ID, and its original data survives the failed save.
    assert.equal((await save(2, { dccAddress: 99, decoders: [decoder()] })).status, 409);
    const wagon = await (await request('/api/vozidla/2/dekodery')).json();
    assert.equal(wagon.dccAddress, 55); assert.equal(wagon.decoders[0].id, 'wagon-light');
    assert.equal((await save(1, { ...body, decoders: [{ ...decoder(), manualUrl: 'javascript:alert(1)' }] })).status, 400);
    assert.equal((await (await request('/api/vozidla/1/dekodery')).json()).decoders.length, 2);
    for (const page of ['/lokomotivy/1', '/vozy/2', '/dcc', '/soupravy?souprava=1', '/soupravy/1']) {
      const response = await request(page); assert.equal(response.status, 200, `${page}\n${logs}`);
      const html = await response.text(); assert.ok(html.includes(page === '/dcc' ? '55' : page.startsWith('/soupravy') ? 'Test wagon' : 'Dekodéry a DCC funkce'));
    }
    assert.equal((await request('/api/vlaky/1/vozidla', { method: 'PUT', headers, body: JSON.stringify({ action: 'update', trainVehicleId: 1, lightingDecoderAddress: 8 }) })).status, 400);
    assert.equal((await save(1, { dccAddress: null, decoders: [] })).status, 200);
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM decoder_functions WHERE vehicle_id = 1').get() as {n: number}).n, 0);
    assert.equal((await request('/api/vozidla/2', { method: 'DELETE', headers })).status, 200);
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM vehicle_decoders WHERE vehicle_id = 2').get() as {n: number}).n, 0);
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM decoder_functions WHERE vehicle_id = 2').get() as {n: number}).n, 0);
  } finally {
    server.kill('SIGTERM');
    await new Promise<void>(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', () => resolve()); });
    sqlite.close(); rmSync(directory, { recursive: true, force: true });
  }
});
