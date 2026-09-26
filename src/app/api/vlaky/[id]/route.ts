import { isTrafficKind } from "@/lib/vehicle-kind";
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
  const denied = await authorizeApiRequest();
  if (denied) return denied;
  const { id } = await params;
  const body = await request.json();
  if (body.kind !== undefined && !isTrafficKind(body.kind)) return NextResponse.json({ error: "Neplatný druh soupravy." }, { status: 400 });
  const train = await db
    .update(schema.trains)
    .set({
      kind: body.kind,
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
  const denied = await authorizeApiRequest();
  if (denied) return denied;
  const { id } = await params;
  await db.delete(schema.trains)
    .where(eq(schema.trains.id, parseInt(id, 10)))
    .run();
  return NextResponse.json({ ok: true });
}
