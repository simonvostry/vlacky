import {config} from 'dotenv';
import {createClient} from '@libsql/client';
config({path:'.env.local',quiet:true});
const url=process.env.EPOCH_MIGRATION_URL || process.env.TURSO_DATABASE_URL || 'file:data/vlacky.db';
const client=createClient({url,authToken:url.startsWith('file:')?undefined:process.env.TURSO_AUTH_TOKEN});
const tx=await client.transaction('write');
try {
 for (const table of ['vehicles','vehicle_catalog','catalog_images']) {
  const columns=new Set((await tx.execute(`PRAGMA table_info(${table})`)).rows.map(r=>r.name));
  if (!columns.size) continue; // Minimal old installations may have no reference catalog yet.
  if(!columns.has('epochs')) await tx.execute(`ALTER TABLE ${table} ADD COLUMN epochs TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(epochs) AND json_type(epochs)='array')`);
  if(!columns.has('epoch_notes')) await tx.execute(`ALTER TABLE ${table} ADD COLUMN epoch_notes TEXT`);
 }
 await tx.commit();console.log('Epoch fields ready; no assignments inferred or existing records changed.');
} catch(error) {await tx.rollback();throw error;}
finally{tx.close();client.close();}
