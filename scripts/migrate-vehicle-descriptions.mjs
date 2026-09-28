import { config } from 'dotenv';
import { createClient } from '@libsql/client';
config({path:'.env.local',quiet:true});
const url=process.env.VEHICLE_DESCRIPTION_MIGRATION_URL || process.env.TURSO_DATABASE_URL || 'file:data/vlacky.db';
const client=createClient({url,authToken:url.startsWith('file:') ? undefined : process.env.TURSO_AUTH_TOKEN});
const tx=await client.transaction('write');
try {
  const columns=new Set((await tx.execute('PRAGMA table_info(vehicles)')).rows.map(r=>r.name));
  for(const name of ['description','reference_notes']) if(!columns.has(name)) await tx.execute(`ALTER TABLE vehicles ADD COLUMN ${name} TEXT`);
  await tx.commit();console.log('Vehicle description and reference notes ready; existing content unchanged.');
} catch(error) {await tx.rollback();throw error;} finally {tx.close();client.close();}
