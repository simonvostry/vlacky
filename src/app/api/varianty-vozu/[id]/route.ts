import { authorizeApiRequest } from '@/lib/auth-guards';
import { resizeVariant, CollectionError } from '@/lib/wagon-storage';
import { NextResponse } from 'next/server';
export async function PUT(request: Request, { params }: { params: Promise<{id:string}> }) {
  const denied = await authorizeApiRequest();
  if (denied) return denied;
  try {
    const vehicleId = await resizeVariant(Number((await params).id), await request.json());
    return NextResponse.json({ vehicleId });
  } catch (error) {
    if (error instanceof CollectionError) return NextResponse.json({error:error.message},{status:error.status});
    throw error;
  }
}
