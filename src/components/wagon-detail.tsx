import { EpochBadges } from "@/components/vehicle-epochs";
import { formatVehicleLength } from "@/components/vehicle-length";
import { OperatorLogo } from "@/components/operator-logo";
import { ManufacturerLogo } from "@/components/manufacturer-logo";
import { WagonPieces } from "@/components/wagon-pieces";
import { EditAction } from "@/components/ui-actions";
import { getDecoders } from "@/lib/decoder-storage";
import { vehicleSection } from "@/lib/vehicle-kind";
import { requireUser } from "@/lib/auth-guards";
import { VehicleDetailImage } from "@/components/vehicle-detail-image";
import { db, schema } from "@/db";
import { eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { ClassBadge } from "@/components/class-badge";
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
  const templates = decoders.map(decoder => ({ decoder, label: `${allVehicles.find(v => v.id === decoder.vehicleId)?.designation || "Vozidlo"} · ${decoder.name}${decoder.model ? ` (${decoder.model})` : ""}` }));

  return <div className="mx-auto max-w-7xl">
    <Link href={`/${vehicleSection(vehicle)}`} className="mb-4 inline-block text-sm text-secondary hover:text-accent">&larr; Zpět na vozidla</Link>
    <section aria-label="Společné údaje vozu" className="edit-reveal-scope rounded-lg border border-divider p-4 sm:p-5">
      {vehicle.imagePath && <div className="mb-4 rounded-lg bg-subtle px-4 py-5 sm:px-6">
        <VehicleDetailImage src={vehicle.imagePath} alt={vehicle.designation}
          width={(vehicle.imageWidth || 264) * 2} height={(vehicle.imageHeight || 41) * 2} center />
      </div>}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-2xl font-bold">{vehicle.designation}</h1>
          <span data-vehicle-label="operator"><OperatorLogo operator={vehicle.operator} height={32} maxWidth={160} /></span>
          <EpochBadges epochs={vehicle.epochs} />
          <span data-vehicle-label="class" className="inline-flex"><ClassBadge classType={vehicle.classType} size="md" /></span>
          {vehicle.lengthOverBuffersMm != null && <span title="Délka modelu přes nárazníky" aria-label={`Délka modelu přes nárazníky: ${formatVehicleLength(vehicle.lengthOverBuffersMm)}`} className="text-sm tabular-nums text-secondary">{formatVehicleLength(vehicle.lengthOverBuffersMm)}</span>}
          {vehicle.manufacturer && <ManufacturerLogo manufacturer={vehicle.manufacturer} />}
          {vehicle.catalogNumber && <span title="Katalogové číslo výrobce" className="text-sm text-secondary">{vehicle.catalogNumber}</span>}
        </div>
        <span className="edit-reveal"><EditAction href={`/${vehicleSection(vehicle)}/${vehicle.id}/upravit`} label="Upravit společné údaje varianty" /></span>
      </div>
      {vehicle.epochNotes && <details className="mt-3 text-xs text-secondary"><summary className="cursor-pointer">Zdroj a upřesnění epochy</summary><p className="mt-2 whitespace-pre-wrap break-words">{vehicle.epochNotes}</p></details>}
    </section>
    <WagonPieces key={`${vehicle.wagonVariantId}-${pieces.map(p=>p.id).join(',')}`} variantId={vehicle.wagonVariantId}
      pieces={pieces} selectedId={vehicle.id} section={vehicleSection(vehicle)} decoders={decoders.filter(d => pieces.some(p => p.id === d.vehicleId))} templates={templates} appearances={appearances} />
  </div>;
}
