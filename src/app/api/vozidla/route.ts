import { eq } from "drizzle-orm";
import { saveVehicle, CollectionError } from "@/lib/wagon-storage";
import { authorizeApiRequest } from "@/lib/auth-guards";
import { db, schema } from "@/db";
import { NextResponse } from "next/server";

export async function GET() {
  const denied = await authorizeApiRequest();
  if (denied) return denied;
  const vehicles = await db
    .select()
    .from(schema.vehicles)
    .orderBy(schema.vehicles.type, schema.vehicles.designation)
    .all();
  return NextResponse.json(vehicles);
}

export async function POST(request: Request) {
  const denied = await authorizeApiRequest();
  if (denied) return denied;
  const body = await request.json();
  try {
    const savedId = await saveVehicle(body, undefined);
    const vehicle = await db.select().from(schema.vehicles).where(eq(schema.vehicles.id, savedId)).get();
    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    if (error instanceof CollectionError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
