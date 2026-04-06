import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const functions = await db
    .select()
    .from(schema.decoderFunctions)
    .where(eq(schema.decoderFunctions.vehicleId, parseInt(id, 10)))
    .orderBy(schema.decoderFunctions.functionNumber)
    .all();
  return NextResponse.json(functions);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const fn = await db
    .insert(schema.decoderFunctions)
    .values({
      vehicleId: parseInt(id, 10),
      functionNumber: body.functionNumber,
      label: body.label,
      description: body.description || null,
    })
    .returning()
    .get();
  return NextResponse.json(fn, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  await db.delete(schema.decoderFunctions)
    .where(eq(schema.decoderFunctions.id, body.functionId))
    .run();
  return NextResponse.json({ ok: true });
}
