import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import Database from 'better-sqlite3';
import test from 'node:test';
test('catalog migration links existing decoder models without rewriting physical settings and is repeatable',()=>{
 const dir=mkdtempSync(join(tmpdir(),'vlacky-decoder-catalog-')),path=join(dir,'test.db'),db=new Database(path);
 try{
  db.exec(`CREATE TABLE vehicle_decoders(id TEXT PRIMARY KEY,manufacturer TEXT,model TEXT,address INTEGER,cvs TEXT);
   INSERT INTO vehicle_decoders VALUES('one','ESU','LokPilot',69,'[{"number":1,"value":69}]'),('two',' esu ','lokpilot',70,'[]'),('unknown','','Old unknown model',null,'[]'),('partial','ZIMO','',3,'[]')`);
  const old=db.prepare('SELECT * FROM vehicle_decoders ORDER BY id').all();
  const run=()=>execFileSync(process.execPath,['scripts/migrate-decoder-catalog.mjs'],{env:{...process.env,DECODER_CATALOG_MIGRATION_URL:`file:${path}`}});
  run();run();
  assert.deepEqual(db.prepare('SELECT id,manufacturer,model,address,cvs FROM vehicle_decoders ORDER BY id').all(),old);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM decoder_manufacturers').get() as {n:number}).n,2);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM decoder_models').get() as {n:number}).n,1);
  const rows=db.prepare('SELECT id,catalog_model_id AS model FROM vehicle_decoders ORDER BY id').all() as {id:string;model:number|null}[];
  assert.equal(rows.find(r=>r.id==='one')!.model,rows.find(r=>r.id==='two')!.model);assert.equal(rows.find(r=>r.id==='unknown')!.model,null);
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
