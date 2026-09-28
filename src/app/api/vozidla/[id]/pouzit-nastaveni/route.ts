import { NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { db, schema } from '@/db';
import { authorizeApiRequest } from '@/lib/auth-guards';
import { applyWagonSettings, CollectionError } from '@/lib/wagon-storage';
import { getDecoders } from '@/lib/decoder-storage';

export async function POST(request: Request, {params}: {params: Promise<{id:string}>}) {
  const denied = await authorizeApiRequest();
  if (denied) return denied;
  const rawId = (await params).id;
  if (!/^[1-9]\d*$/.test(rawId)) return NextResponse.json({error:'Neplatné vozidlo.'},{status:400});
  const body = await request.json().catch(()=>null);
  try {
    const targetIds = await applyWagonSettings(Number(rawId),body);
    const pieces = await db.select().from(schema.vehicles).where(inArray(schema.vehicles.id,targetIds)).all();
    const decoders = (await Promise.all(targetIds.map(id=>getDecoders(id)))).flat();
    return NextResponse.json({pieces,decoders});
  } catch(error) {
    return NextResponse.json({error:error instanceof CollectionError ? error.message : 'Přenos nastavení se nepodařilo dokončit. Obnovte stránku a zkontrolujte vozy.'},{status:error instanceof CollectionError ? error.status : 409});
  }
}
