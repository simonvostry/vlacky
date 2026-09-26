import { saveVehicle, removeVehicle, CollectionError } from "@/lib/wagon-storage";
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
  try {
    const savedId = await saveVehicle(body, parseInt(id, 10));
    const vehicle = await db.select().from(schema.vehicles).where(eq(schema.vehicles.id, savedId)).get();
    return NextResponse.json(vehicle, { status: 200 });
  } catch (error) {
    if (error instanceof CollectionError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await authorizeApiRequest();
  if (denied) return denied;
  const { id } = await params;
  try { await removeVehicle(parseInt(id, 10)); return NextResponse.json({ ok: true }); }
  catch (error) {
    if (error instanceof CollectionError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
