import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import test from 'node:test';
import { equipmentIndicators, hasVehicleSound, soundEquipmentPatch } from '../src/lib/vehicle-equipment';

test('unified sound preserves legacy distinctions and never invents a decoder', () => {
  for (const hasSoundDecoder of [false, true]) for (const hasSpeaker of [false, true]) {
    const previous = { hasSoundDecoder, hasSpeaker };
    assert.equal(hasVehicleSound(previous), hasSoundDecoder || hasSpeaker);
    assert.deepEqual(soundEquipmentPatch(true, previous), hasSoundDecoder || hasSpeaker ? previous : {hasSoundDecoder: false, hasSpeaker: true});
    assert.deepEqual(soundEquipmentPatch(false, previous), {hasSoundDecoder: false, hasSpeaker: false});
    const indicators = equipmentIndicators(previous);
    assert.equal(indicators.filter(i => i.key === 'sound').length, 1);
    assert.equal(indicators.find(i => i.key === 'sound')?.active, hasSoundDecoder || hasSpeaker);
  }
  assert.deepEqual(equipmentIndicators({}).map(i=>i.active), [false,false,false,false,false]);
  assert.equal(equipmentIndicators({magneticCouplerA:true})[0].badge, 'A');
  assert.equal(equipmentIndicators({magneticCouplerB:true})[0].badge, 'B');
  assert.equal(equipmentIndicators({magneticCouplerA:true,magneticCouplerB:true})[0].badge, '2');
  assert.deepEqual(equipmentIndicators({isWeathered:true},false).map(i=>i.key), ['weather']);
});

test('equipment migration preserves legacy data, initializes each end, and never overwrites later edits', () => {
  const directory = mkdtempSync(join(tmpdir(), 'vlacky-equipment-'));
  const path = join(directory, 'test.db');
  const db = new Database(path);
  try {
    db.exec(`CREATE TABLE vehicles (id INTEGER PRIMARY KEY, type TEXT, magnetic_couplers INTEGER, has_lights INTEGER, wagon_variant_id INTEGER, dcc_address INTEGER, notes TEXT);
      INSERT INTO vehicles VALUES (1,'loco',NULL,1,NULL,36,'Calibration stays'),(2,'wagon',1,1,10,44,'Both magnetic'),(3,'wagon',0,0,10,NULL,'Ordinary'),(4,'wagon',NULL,NULL,10,NULL,'Unknown');`);
    const original = db.prepare('SELECT * FROM vehicles').all();
    const migrate = () => execFileSync(process.execPath, ['scripts/migrate-vehicle-equipment.mjs'], { env: {...process.env, VEHICLE_EQUIPMENT_MIGRATION_URL: `file:${path}`} });
    migrate();
    const fields = ['magnetic_coupler_a','magnetic_coupler_b','has_tail_lights','has_sound_decoder','has_speaker','is_weathered'];
    const rows = db.prepare('SELECT * FROM vehicles').all() as Record<string, unknown>[];
    assert.deepEqual(rows.map(row=>Object.fromEntries(Object.entries(row).filter(([key])=>!fields.includes(key)))), original);
    assert.deepEqual(rows.map(r=>[r.magnetic_coupler_a,r.magnetic_coupler_b]), [[0,0],[1,1],[0,0],[0,0]]);
    for (const row of rows) for (const key of fields.slice(2)) assert.equal(row[key],0);
    db.exec('UPDATE vehicles SET magnetic_coupler_b=0,has_tail_lights=1,has_speaker=1,is_weathered=1 WHERE id=2');
    const edited = db.prepare('SELECT * FROM vehicles').all();migrate();assert.deepEqual(db.prepare('SELECT * FROM vehicles').all(),edited);
    db.exec("INSERT INTO vehicles (id,type) VALUES (5,'wagon')");
    const fresh=db.prepare('SELECT * FROM vehicles WHERE id=5').get() as Record<string,unknown>;
    for (const key of fields) {assert.equal(fresh[key],0);assert.throws(()=>db.exec(`UPDATE vehicles SET ${key}=NULL WHERE id=5`));assert.throws(()=>db.exec(`UPDATE vehicles SET ${key}=2 WHERE id=5`));}
  } finally {db.close();rmSync(directory,{recursive:true,force:true});}
});

test('lighting migration replaces only unknown values and defaults legacy inserts to No', () => {
  const directory = mkdtempSync(join(tmpdir(), 'vlacky-lighting-'));
  const path = join(directory, 'test.db');
  const db = new Database(path);
  try {
    db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE vehicles (id INTEGER PRIMARY KEY, has_lights INTEGER, dcc_address INTEGER, notes TEXT);
      CREATE TABLE assigned (vehicle_id INTEGER REFERENCES vehicles(id));
      INSERT INTO vehicles VALUES (1,1,44,'Keep Yes'),(2,0,NULL,'Keep No'),(3,NULL,36,'Default No');
      INSERT INTO assigned VALUES (1),(3);`);
    const migrate = () => execFileSync(process.execPath, ['scripts/migrate-lighting-defaults.mjs'], {env:{...process.env,LIGHTING_MIGRATION_URL:`file:${path}`}});
    const expected = db.prepare('SELECT * FROM vehicles').all().map(row => ({...(row as Record<string, unknown>), has_lights: (row as {has_lights:number|null}).has_lights ?? 0}));
    migrate();assert.deepEqual(db.prepare('SELECT * FROM vehicles').all(),expected);
    db.exec("INSERT INTO vehicles(id,notes) VALUES(4,'Omitted'); INSERT INTO vehicles(id,has_lights) VALUES(5,NULL); UPDATE vehicles SET has_lights=NULL WHERE id=2");
    assert.deepEqual(db.prepare('SELECT has_lights FROM vehicles ORDER BY id').all(),[{has_lights:1},{has_lights:0},{has_lights:0},{has_lights:0},{has_lights:0}]);
    const saved=db.prepare('SELECT * FROM vehicles').all();migrate();assert.deepEqual(db.prepare('SELECT * FROM vehicles').all(),saved);
    assert.deepEqual(db.prepare('SELECT * FROM assigned').all(),[{vehicle_id:1},{vehicle_id:3}]);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  } finally {db.close();rmSync(directory,{recursive:true,force:true});}
});
