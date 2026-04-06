import { db, schema } from "@/db";
import { eq, and, gt, lt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

// Add a vehicle to a train
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trainId = parseInt(id, 10);
  const body = await request.json();

  // Get max position
  const max = await db
    .select({ maxPos: sql<number>`coalesce(max(${schema.trainVehicles.position}), 0)` })
    .from(schema.trainVehicles)
    .where(eq(schema.trainVehicles.trainId, trainId))
    .get();

  const tv = await db
    .insert(schema.trainVehicles)
    .values({
      trainId,
      vehicleId: body.vehicleId,
      position: (max?.maxPos || 0) + 1,
      dccAddressOverride: body.dccAddressOverride || null,
      lightingDecoderAddress: body.lightingDecoderAddress || null,
      notes: body.notes || null,
    })
    .returning()
    .get();

  return NextResponse.json(tv, { status: 201 });
}

// Reorder or update a vehicle in the train
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trainId = parseInt(id, 10);
  const body = await request.json();

  // Move vehicle: { trainVehicleId, direction: "up" | "down" }
  if (body.action === "move") {
    const tv = await db
      .select()
      .from(schema.trainVehicles)
      .where(eq(schema.trainVehicles.id, body.trainVehicleId))
      .get();

    if (!tv) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const newPos =
      body.direction === "up" ? tv.position - 1 : tv.position + 1;

    if (newPos < 1) return NextResponse.json({ error: "Already first" }, { status: 400 });

    // Find the vehicle at the target position
    const other = await db
      .select()
      .from(schema.trainVehicles)
      .where(
        and(
          eq(schema.trainVehicles.trainId, trainId),
          eq(schema.trainVehicles.position, newPos)
        )
      )
      .get();

    if (!other) return NextResponse.json({ error: "No swap target" }, { status: 400 });

    // Swap positions
    await db.update(schema.trainVehicles)
      .set({ position: newPos })
      .where(eq(schema.trainVehicles.id, tv.id))
      .run();
    await db.update(schema.trainVehicles)
      .set({ position: tv.position })
      .where(eq(schema.trainVehicles.id, other.id))
      .run();

    return NextResponse.json({ ok: true });
  }

  // Update train vehicle properties
  if (body.action === "update") {
    const tv = await db
      .update(schema.trainVehicles)
      .set({
        dccAddressOverride: body.dccAddressOverride ?? null,
        lightingDecoderAddress: body.lightingDecoderAddress ?? null,
        notes: body.notes ?? null,
      })
      .where(eq(schema.trainVehicles.id, body.trainVehicleId))
      .returning()
      .get();
    return NextResponse.json(tv);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// Remove a vehicle from a train
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trainId = parseInt(id, 10);
  const body = await request.json();

  const tv = await db
    .select()
    .from(schema.trainVehicles)
    .where(eq(schema.trainVehicles.id, body.trainVehicleId))
    .get();

  if (!tv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(schema.trainVehicles)
    .where(eq(schema.trainVehicles.id, body.trainVehicleId))
    .run();

  // Reorder remaining vehicles
  await db.update(schema.trainVehicles)
    .set({ position: sql`${schema.trainVehicles.position} - 1` })
    .where(
      and(
        eq(schema.trainVehicles.trainId, trainId),
        gt(schema.trainVehicles.position, tv.position)
      )
    )
    .run();

  return NextResponse.json({ ok: true });
}
