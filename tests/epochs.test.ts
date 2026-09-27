import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import test from 'node:test';
import { epochLabel, readEpochs } from '../src/lib/epochs';
import { facetOptions, matchesFilters, selectedFilters, vehicleFacets } from '../src/lib/collection-filters';
import { rememberedFilterQuery, resetFilterQuery } from '../src/lib/collection-filter-memory';

test('Roman labels, overlapping epochs, unknowns and remembered/reset filters', () => {
 assert.equal(epochLabel([4,5,6]),'IV / V / VI');assert.equal(epochLabel([]),'Nevyplněna');
 assert.deepEqual(readEpochs('[6,4,4,0,"5",7]'),[4,6]);assert.deepEqual(readEpochs('invalid'),[]);
 const multi=vehicleFacets({designation:'Rils',operator:'ČD Cargo',type:'wagon',epochs:[5,6]});
 for(const epocha of ['5','6']) assert.equal(matchesFilters(multi,selectedFilters({epocha}),['epocha']),true);
 for(const epocha of ['4','V','5,6','nezarazeno']) assert.equal(matchesFilters(multi,selectedFilters({epocha}),['epocha']),false);
 assert.equal(matchesFilters(vehicleFacets({designation:'?',operator:null,type:'loco'}),selectedFilters({epocha:'nezarazeno'}),['epocha']),true);
 assert.equal(matchesFilters(multi,selectedFilters({epocha:'5',op:'DB'}),['epocha','op']),false);
 assert.deepEqual(facetOptions([], 'epocha').map(o=>o.label),['Epocha I','Epocha II','Epocha III','Epocha IV','Epocha V','Epocha VI','Nevyplněna']);
 assert.equal(rememberedFilterQuery('/vozy','epocha=5&op=DB'),'op=DB&epocha=5');
 assert.equal(new URLSearchParams(resetFilterQuery('/katalog','epocha=6&barvy=1')).get('epocha'),null);
});

test('epoch migration preserves references and assignments across repeats without inferring history',()=>{
 const dir=mkdtempSync(join(tmpdir(),'vlacky-epochs-'));const path=join(dir,'test.db');const db=new Database(path);
 try {
  for(const table of ['vehicles','vehicle_catalog','catalog_images']) db.exec(`CREATE TABLE ${table}(id INTEGER PRIMARY KEY, notes TEXT); INSERT INTO ${table} VALUES (1,'Epoche IV, do not auto-parse');`);
  const migrate=()=>execFileSync(process.execPath,['scripts/migrate-epochs.mjs'],{env:{...process.env,EPOCH_MIGRATION_URL:`file:${path}`}});
  migrate();
  for(const table of ['vehicles','vehicle_catalog','catalog_images']) {
   assert.deepEqual(db.prepare(`SELECT * FROM ${table}`).get(),{id:1,notes:'Epoche IV, do not auto-parse',epochs:'[]',epoch_notes:null});
   db.prepare(`UPDATE ${table} SET epochs=?,epoch_notes=?`).run('[5,6]','Manufacturer evidence');
  }
  migrate();
  for(const table of ['vehicles','vehicle_catalog','catalog_images']) assert.deepEqual(db.prepare(`SELECT * FROM ${table}`).get(),{id:1,notes:'Epoche IV, do not auto-parse',epochs:'[5,6]',epoch_notes:'Manufacturer evidence'});
  assert.throws(()=>db.exec("UPDATE vehicles SET epochs='bad'"));
 } finally {db.close();rmSync(dir,{recursive:true,force:true});}
});
