import { EditAction } from "@/components/ui-actions";
import { getDecoders } from "@/lib/decoder-storage";
import { requireUser } from "@/lib/auth-guards";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { TrainComposition } from "@/components/train-composition";
import { TrainVehicleManager } from "@/components/train-vehicle-manager";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TrainDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const trainId = parseInt(id, 10);
  if (isNaN(trainId)) notFound();

  const train = await db
    .select()
    .from(schema.trains)
    .where(eq(schema.trains.id, trainId))
    .get();

  if (!train) notFound();

  const trainVehicles = await db
    .select({
      tvId: schema.trainVehicles.id,
      position: schema.trainVehicles.position,
      notes: schema.trainVehicles.notes,
      vehicle: {
        id: schema.vehicles.id,
        dccAddress: schema.vehicles.dccAddress,
        designation: schema.vehicles.designation,
        operator: schema.vehicles.operator,
        type: schema.vehicles.type,
        wagonKind: schema.vehicles.wagonKind,
        classType: schema.vehicles.classType,
        imagePath: schema.vehicles.imagePath,
        imageWidth: schema.vehicles.imageWidth,
        imageHeight: schema.vehicles.imageHeight,
      },
    })
    .from(schema.trainVehicles)
    .innerJoin(
      schema.vehicles,
      eq(schema.trainVehicles.vehicleId, schema.vehicles.id)
    )
    .where(eq(schema.trainVehicles.trainId, trainId))
    .orderBy(schema.trainVehicles.position)
    .all();

  // Physical IDs remain the train membership identity; the picker groups variants.
  const allVehicles = await db
    .select()
    .from(schema.vehicles)
    .orderBy(schema.vehicles.type, schema.vehicles.designation)
    .all();

  const decoders = await getDecoders();

  // Flat list for manager
  const managerRows = trainVehicles.map((tv) => ({
    id: tv.tvId,
    position: tv.position,
    vehicleId: tv.vehicle.id,
    designation: tv.vehicle.designation,
    operator: tv.vehicle.operator,
    vehicleType: tv.vehicle.type,
    wagonKind: tv.vehicle.wagonKind,
    classType: tv.vehicle.classType,
    dccAddresses: [...new Set([tv.vehicle.dccAddress, ...decoders.filter(d => d.vehicleId === tv.vehicle.id).map(d => d.address ?? tv.vehicle.dccAddress)].filter(a => a !== null))].join(", "),
    notes: tv.notes,
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href={`/soupravy?druh=${train.kind}`}
        className="mb-4 inline-block text-sm text-secondary hover:text-secondary"
      >
        &larr; Zpět na vlaky
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3">
          {train.category && (
            <span className="rounded bg-muted px-2 py-1 text-sm font-bold text-foreground">
              {train.category}
            </span>
          )}
          <h1 className="text-2xl font-bold">{train.number}</h1>
          {train.name && (
            <span className="text-xl italic text-secondary">{train.name}</span>
          )}
        </div>
        {train.route && (
          <p className="mt-2 text-secondary">{train.route}</p>
        )}
        {train.era && (
          <p className="mt-1 text-sm text-secondary">
            Jízdní řád {train.era}
          </p>
        )}
        {train.notes && (
          <p className="mt-2 text-sm text-secondary">{train.notes}</p>
        )}
        <div className="mt-3">
          <EditAction href={`/soupravy/${train.id}/upravit`} label="Upravit soupravu" />
        </div>
      </div>

      <div className="rounded-lg border border-divider bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold">Řazení {train.kind === "freight" ? "nákladní" : "osobní"} soupravy</h2>
        <div className="overflow-x-auto"><TrainComposition vehicles={trainVehicles} /></div>
      </div>

      {/* Vehicle manager */}
      <div className="mt-8">
        <TrainVehicleManager
          trainId={trainId}
          kind={train.kind}
          trainVehicles={managerRows}
          allVehicles={allVehicles}
        />
      </div>

    </div>
  );
}
