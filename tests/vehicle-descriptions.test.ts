import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import Database from 'better-sqlite3';
import test from 'node:test';
test('description migration preserves existing content and is repeatable',()=>{
 const dir=mkdtempSync(join(tmpdir(),'vlacky-description-'));const path=join(dir,'test.db');const db=new Database(path);
 try {
  db.exec("CREATE TABLE vehicles(id INTEGER PRIMARY KEY,notes TEXT,dcc_address INTEGER); INSERT INTO vehicles VALUES(1,'Original source URL',69)");
  const run=()=>execFileSync(process.execPath,['scripts/migrate-vehicle-descriptions.mjs'],{env:{...process.env,VEHICLE_DESCRIPTION_MIGRATION_URL:`file:${path}`}});
  run();assert.deepEqual(db.prepare('SELECT * FROM vehicles').get(),{id:1,notes:'Original source URL',dcc_address:69,description:null,reference_notes:null});
  db.exec("UPDATE vehicles SET description='80 míst',reference_notes='Preserved source'");const before=db.prepare('SELECT * FROM vehicles').get();run();assert.deepEqual(db.prepare('SELECT * FROM vehicles').get(),before);
 }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});
