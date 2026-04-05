import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const vehicle = db
    .select()
    .from(schema.vehicles)
    .where(eq(schema.vehicles.id, parseInt(id, 10)))
    .get();
  if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(vehicle);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const vehicle = db
    .update(schema.vehicles)
    .set({
      designation: body.designation,
      operator: body.operator || null,
      type: body.type,
      classType: body.classType || null,
      imagePath: body.imagePath || null,
      imageWidth: body.imageWidth || null,
      imageHeight: body.imageHeight || null,
      manufacturer: body.manufacturer || null,
      catalogNumber: body.catalogNumber || null,
      dccAddress: body.dccAddress || null,
      notes: body.notes || null,
    })
    .where(eq(schema.vehicles.id, parseInt(id, 10)))
    .returning()
    .get();
  if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(vehicle);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.delete(schema.vehicles)
    .where(eq(schema.vehicles.id, parseInt(id, 10)))
    .run();
  return NextResponse.json({ ok: true });
}
