import { parseDccAddress } from "@/lib/decoder-config";
import { authorizeApiRequest } from "@/lib/auth-guards";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await authorizeApiRequest();
  if (denied) return denied;
  const { id } = await params;
  const vehicle = await db
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
  const denied = await authorizeApiRequest();
  if (denied) return denied;
  const { id } = await params;
  const body = await request.json();
  if (body.isTemplate !== undefined && typeof body.isTemplate !== "boolean") return NextResponse.json({ error: "isTemplate must be boolean" }, { status: 400 });
  try { parseDccAddress(body.dccAddress ?? null); }
  catch { return NextResponse.json({ error: "DCC adresa musí být celé číslo 1–10239." }, { status: 400 }); }
  const vehicle = await db
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
      catalogId: body.catalogId || null,
      catalogImageId: body.catalogImageId || null,
      dccAddress: body.dccAddress || null,
      isTemplate: body.isTemplate,
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
  const denied = await authorizeApiRequest();
  if (denied) return denied;
  const { id } = await params;
  await db.delete(schema.vehicles)
    .where(eq(schema.vehicles.id, parseInt(id, 10)))
    .run();
  return NextResponse.json({ ok: true });
}
