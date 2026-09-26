import { isTrafficKind } from "@/lib/vehicle-kind";
import { authorizeApiRequest } from "@/lib/auth-guards";
import { db, schema } from "@/db";
import { NextResponse } from "next/server";

export async function GET() {
  const denied = await authorizeApiRequest();
  if (denied) return denied;
  const trains = await db
    .select()
    .from(schema.trains)
    .orderBy(schema.trains.category, schema.trains.number)
    .all();
  return NextResponse.json(trains);
}

export async function POST(request: Request) {
  const denied = await authorizeApiRequest();
  if (denied) return denied;
  const body = await request.json();
  if (body.kind !== undefined && !isTrafficKind(body.kind)) return NextResponse.json({ error: "Neplatný druh soupravy." }, { status: 400 });
  const train = await db
    .insert(schema.trains)
    .values({
      kind: body.kind,
      number: body.number || null,
      name: body.name || null,
      category: body.category || null,
      route: body.route || null,
      era: body.era || null,
      notes: body.notes || null,
    })
    .returning()
    .get();
  return NextResponse.json(train, { status: 201 });
}
