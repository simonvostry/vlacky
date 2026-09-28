import { authorizeApiRequest } from '@/lib/auth-guards';
import { addWagonCopy, CollectionError } from '@/lib/wagon-storage';
import { getDecoders } from '@/lib/decoder-storage';
import { db, schema } from '@/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(request: Request, {params}: {params: Promise<{id:string}>}) {
  const denied = await authorizeApiRequest();
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  try {
    const id = await addWagonCopy(Number((await params).id), body?.mode);
    const vehicle = await db.select().from(schema.vehicles).where(eq(schema.vehicles.id,id)).get();
    return NextResponse.json({...vehicle,decoders:await getDecoders(id)},{status:201});
  } catch(error) {
    if (error instanceof CollectionError) return NextResponse.json({error:error.message},{status:error.status});
    throw error;
  }
}
