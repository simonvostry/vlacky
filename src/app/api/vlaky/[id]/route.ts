import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const train = await db
    .select()
    .from(schema.trains)
    .where(eq(schema.trains.id, parseInt(id, 10)))
    .get();
  if (!train) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(train);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const train = await db
    .update(schema.trains)
    .set({
      number: body.number || null,
      name: body.name || null,
      category: body.category || null,
      route: body.route || null,
      era: body.era || null,
      notes: body.notes || null,
    })
    .where(eq(schema.trains.id, parseInt(id, 10)))
    .returning()
    .get();
  if (!train) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(train);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(schema.trains)
    .where(eq(schema.trains.id, parseInt(id, 10)))
    .run();
  return NextResponse.json({ ok: true });
}
