import { db, schema } from "@/db";
import { NextResponse } from "next/server";

export async function GET() {
  const trains = db
    .select()
    .from(schema.trains)
    .orderBy(schema.trains.category, schema.trains.number)
    .all();
  return NextResponse.json(trains);
}

export async function POST(request: Request) {
  const body = await request.json();
  const train = db
    .insert(schema.trains)
    .values({
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
