import { isTrafficKind } from "@/lib/vehicle-kind";
import { parseDccAddress } from "@/lib/decoder-config";
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
  if (body.wagonKind !== undefined && !isTrafficKind(body.wagonKind)) return NextResponse.json({ error: "Neplatný druh vozu." }, { status: 400 });
  if (body.type !== undefined && !["loco", "wagon"].includes(body.type)) return NextResponse.json({ error: "Neplatný typ vozidla." }, { status: 400 });
  if (body.isTemplate !== undefined && typeof body.isTemplate !== "boolean") return NextResponse.json({ error: "isTemplate must be boolean" }, { status: 400 });
  try { parseDccAddress(body.dccAddress ?? null); }
  catch { return NextResponse.json({ error: "DCC adresa musí být celé číslo 1–10239." }, { status: 400 }); }
  const vehicle = await db
    .insert(schema.vehicles)
    .values({
      designation: body.designation,
      operator: body.operator || null,
      type: body.type,
      wagonKind: body.wagonKind,
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
    .returning()
    .get();
  return NextResponse.json(vehicle, { status: 201 });
}
