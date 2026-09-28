import { OwnedVehicleHeader } from '@/components/owned-vehicle-header';
import { WagonPieces } from "@/components/wagon-pieces";
import { getDecoders } from "@/lib/decoder-storage";
import { vehicleSection } from "@/lib/vehicle-kind";
import { requireUser } from "@/lib/auth-guards";
import { db, schema } from "@/db";
import { eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";


export default async function VehicleDetailPage({
  params, kind,
}: {
  kind: "passenger" | "freight";
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const vehicleId = parseInt(id, 10);
  if (isNaN(vehicleId)) notFound();

  const vehicle = await db
    .select()
    .from(schema.vehicles)
    .where(eq(schema.vehicles.id, vehicleId))
    .get();

  if (!vehicle || vehicle.type !== "wagon") notFound();
  if (vehicle.wagonKind !== kind) redirect(`/${vehicleSection(vehicle)}/${vehicle.id}`);

  const pieces = vehicle.wagonVariantId ? await db.select().from(schema.vehicles).where(eq(schema.vehicles.wagonVariantId, vehicle.wagonVariantId)).orderBy(schema.vehicles.id).all() : [vehicle];

  // Trains this vehicle appears in
  const appearances = await db
    .select({
      vehicleId: schema.trainVehicles.vehicleId,
      trainId: schema.trains.id,
      trainNumber: schema.trains.number,
      trainName: schema.trains.name,
      trainCategory: schema.trains.category,
      position: schema.trainVehicles.position,
    })
    .from(schema.trainVehicles)
    .innerJoin(schema.trains, eq(schema.trainVehicles.trainId, schema.trains.id))
    .where(inArray(schema.trainVehicles.vehicleId, pieces.map(p => p.id)))
    .all();

  const [decoders, allVehicles] = await Promise.all([
    getDecoders(),
    db.select({ id: schema.vehicles.id, designation: schema.vehicles.designation }).from(schema.vehicles).all(),
  ]);
  const templates = decoders.map(decoder => ({ decoder, label: `${allVehicles.find(v => v.id === decoder.vehicleId)?.designation || "Vozidlo"} · ${[decoder.manufacturer, decoder.model].filter(Boolean).join(" · ") || "Dekodér"}` }));

  return <div className="mx-auto max-w-7xl">
    <Link href={`/${vehicleSection(vehicle)}`} className="mb-4 inline-block text-sm text-secondary hover:text-accent">&larr; Zpět na vozidla</Link>
    <OwnedVehicleHeader vehicle={vehicle} />
    <WagonPieces key={vehicle.wagonVariantId ?? vehicle.id}
      pieces={pieces} selectedId={vehicle.id} section={vehicleSection(vehicle)} decoders={decoders.filter(d => pieces.some(p => p.id === d.vehicleId))} templates={templates} appearances={appearances} />
  </div>;
}
