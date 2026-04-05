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
  const { id } = await params;
  const trainId = parseInt(id, 10);
  if (isNaN(trainId)) notFound();

  const train = db
    .select()
    .from(schema.trains)
    .where(eq(schema.trains.id, trainId))
    .get();

  if (!train) notFound();

  const trainVehicles = db
    .select({
      tvId: schema.trainVehicles.id,
      position: schema.trainVehicles.position,
      notes: schema.trainVehicles.notes,
      dccAddressOverride: schema.trainVehicles.dccAddressOverride,
      lightingDecoderAddress: schema.trainVehicles.lightingDecoderAddress,
      vehicle: {
        id: schema.vehicles.id,
        designation: schema.vehicles.designation,
        operator: schema.vehicles.operator,
        type: schema.vehicles.type,
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

  // All vehicles for the manager dropdown
  const allVehicles = db
    .select({
      id: schema.vehicles.id,
      designation: schema.vehicles.designation,
      operator: schema.vehicles.operator,
      type: schema.vehicles.type,
    })
    .from(schema.vehicles)
    .orderBy(schema.vehicles.type, schema.vehicles.designation)
    .all();

  // Flat list for manager
  const managerRows = trainVehicles.map((tv) => ({
    id: tv.tvId,
    position: tv.position,
    vehicleId: tv.vehicle.id,
    designation: tv.vehicle.designation,
    operator: tv.vehicle.operator,
    vehicleType: tv.vehicle.type,
    classType: tv.vehicle.classType,
    dccAddressOverride: tv.dccAddressOverride,
    lightingDecoderAddress: tv.lightingDecoderAddress,
    notes: tv.notes,
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href="/vlaky"
        className="mb-4 inline-block text-sm text-gray-400 hover:text-gray-600"
      >
        &larr; Zpět na vlaky
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3">
          {train.category && (
            <span className="rounded bg-gray-100 px-2 py-1 text-sm font-bold text-gray-700">
              {train.category}
            </span>
          )}
          <h1 className="text-2xl font-bold">{train.number}</h1>
          {train.name && (
            <span className="text-xl italic text-gray-500">{train.name}</span>
          )}
        </div>
        {train.route && (
          <p className="mt-2 text-gray-600">{train.route}</p>
        )}
        {train.era && (
          <p className="mt-1 text-sm text-gray-400">
            Jízdní řád {train.era}
          </p>
        )}
        {train.notes && (
          <p className="mt-2 text-sm text-gray-500">{train.notes}</p>
        )}
        <div className="mt-3">
          <Link
            href={`/vlaky/${train.id}/upravit`}
            className="inline-block rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Upravit vlak
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Řazení soupravy</h2>
        <TrainComposition vehicles={trainVehicles} />
      </div>

      {/* Vehicle manager */}
      <div className="mt-8">
        <TrainVehicleManager
          trainId={trainId}
          trainVehicles={managerRows}
          allVehicles={allVehicles}
        />
      </div>

    </div>
  );
}
