import { db, schema } from "@/db";
import { NextResponse } from "next/server";

export async function GET() {
  const vehicles = await db
    .select()
    .from(schema.vehicles)
    .orderBy(schema.vehicles.type, schema.vehicles.designation)
    .all();
  return NextResponse.json(vehicles);
}

export async function POST(request: Request) {
  const body = await request.json();
  const vehicle = await db
    .insert(schema.vehicles)
    .values({
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
    .returning()
    .get();
  return NextResponse.json(vehicle, { status: 201 });
}
