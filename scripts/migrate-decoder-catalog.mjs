import { config } from 'dotenv';
import { createClient } from '@libsql/client';
config({path:'.env.local',quiet:true});
const url=process.env.DECODER_CATALOG_MIGRATION_URL || process.env.TURSO_DATABASE_URL || 'file:data/vlacky.db';
const client=createClient({url,authToken:url.startsWith('file:')?undefined:process.env.TURSO_AUTH_TOKEN});
const tx=await client.transaction('write');
const key=s=>s.trim().normalize('NFKC').toLocaleLowerCase('cs').replace(/\s+/g,' ');
try {
 await tx.execute('CREATE TABLE IF NOT EXISTS decoder_manufacturers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_key TEXT NOT NULL UNIQUE)');
 await tx.execute('CREATE TABLE IF NOT EXISTS decoder_models (id INTEGER PRIMARY KEY AUTOINCREMENT, manufacturer_id INTEGER NOT NULL REFERENCES decoder_manufacturers(id), name TEXT NOT NULL, name_key TEXT NOT NULL, UNIQUE(manufacturer_id,name_key))');
 const columns=new Set((await tx.execute('PRAGMA table_info(vehicle_decoders)')).rows.map(r=>r.name));
 if(!columns.has('catalog_model_id'))await tx.execute('ALTER TABLE vehicle_decoders ADD COLUMN catalog_model_id INTEGER REFERENCES decoder_models(id)');
 for(const d of (await tx.execute('SELECT id,manufacturer,model FROM vehicle_decoders WHERE catalog_model_id IS NULL')).rows){
  const maker=String(d.manufacturer).trim(),model=String(d.model).trim();if(!maker)continue;
  await tx.execute({sql:'INSERT INTO decoder_manufacturers(name,name_key) VALUES (?,?) ON CONFLICT(name_key) DO NOTHING',args:[maker,key(maker)]});
  const mid=(await tx.execute({sql:'SELECT id FROM decoder_manufacturers WHERE name_key=?',args:[key(maker)]})).rows[0].id;
  if(!model)continue;
  await tx.execute({sql:'INSERT INTO decoder_models(manufacturer_id,name,name_key) VALUES (?,?,?) ON CONFLICT(manufacturer_id,name_key) DO NOTHING',args:[mid,model,key(model)]});
  await tx.execute({sql:'UPDATE vehicle_decoders SET catalog_model_id=(SELECT id FROM decoder_models WHERE manufacturer_id=? AND name_key=?) WHERE id=?',args:[mid,key(model),d.id]});
 }
 await tx.commit();console.log('Decoder catalog ready. Existing decoder fields and configuration preserved.');
}catch(e){await tx.rollback();throw e;}finally{tx.close();client.close();}
