import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import test from 'node:test';

test('length migration is additive, nullable, decimal and repeatable without inferring descriptions', () => {
  const directory = mkdtempSync(join(tmpdir(), 'vlacky-length-'));
  const path = join(directory, 'test.db');
  const db = new Database(path);
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE vehicles (id INTEGER PRIMARY KEY, notes TEXT, dcc_address INTEGER);
      CREATE TABLE assigned (vehicle_id INTEGER REFERENCES vehicles(id));
      INSERT INTO vehicles VALUES (1,'Set length 495 mm; individual length unknown',44),(2,'Keep notes',NULL);
      INSERT INTO assigned VALUES (1);`);
    const before = db.prepare('SELECT * FROM vehicles').all();
    const migrate = () => execFileSync(process.execPath, ['scripts/migrate-vehicle-length.mjs'], {env:{...process.env, VEHICLE_LENGTH_MIGRATION_URL:`file:${path}`}});
    migrate();
    assert.deepEqual(db.prepare('SELECT * FROM vehicles').all(), before.map(row => ({...row as object, length_over_buffers_mm:null})));
    db.exec('UPDATE vehicles SET length_over_buffers_mm=165.25 WHERE id=1');
    const saved = db.prepare('SELECT * FROM vehicles').all();
    migrate(); assert.deepEqual(db.prepare('SELECT * FROM vehicles').all(), saved);
    for (const invalid of [0,-1,10001,'invalid']) assert.throws(() => db.prepare('UPDATE vehicles SET length_over_buffers_mm=? WHERE id=1').run(invalid));
    db.exec('INSERT INTO vehicles(id) VALUES(3)');
    assert.equal((db.prepare('SELECT length_over_buffers_mm AS n FROM vehicles WHERE id=3').get() as {n:null}).n,null);
    assert.deepEqual(db.prepare('SELECT * FROM assigned').all(),[{vehicle_id:1}]);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  } finally { db.close(); rmSync(directory,{recursive:true,force:true}); }
});
