import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { TrainComposition } from "@/components/train-composition";

export const dynamic = "force-dynamic";

export default async function TrainsPage() {
  const allTrains = await db
    .select()
    .from(schema.trains)
    .orderBy(schema.trains.category, schema.trains.number)
    .all() as any[];

  // Load all train vehicles with their vehicle data, grouped by train
  const allTrainVehicles = await db
    .select({
      trainId: schema.trainVehicles.trainId,
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
    .orderBy(schema.trainVehicles.position)
    .all() as any[];

  const vehiclesByTrain = new Map<number, typeof allTrainVehicles>();
  for (const tv of allTrainVehicles) {
    const existing = vehiclesByTrain.get(tv.trainId) || [];
    existing.push(tv);
    vehiclesByTrain.set(tv.trainId, existing);
  }

  return (
    <div>
      {allTrains.length === 0 ? (
        <p className="py-12 text-center text-gray-400">
          Zatím žádné vlaky. Přidejte první!
        </p>
      ) : (
        <div>
          {allTrains.map((t) => {
            const vehicles = vehiclesByTrain.get(t.id) || [];
            return (
              <Link
                key={t.id}
                href={`/vlaky/${t.id}`}
                className="group block py-3 hover:bg-blue-50 transition-colors"
              >
                <div className="mb-1 flex items-baseline gap-2">
                  {t.category && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-bold text-gray-600">
                      {t.category}
                    </span>
                  )}
                  <span className="text-sm font-bold">
                    {t.number}
                  </span>
                  {t.name && (
                    <span className="text-sm italic text-gray-400">
                      {t.name}
                    </span>
                  )}
                  {t.route && (
                    <span className="text-xs text-gray-300">{t.route}</span>
                  )}
                  {t.era && (
                    <span className="text-xs text-gray-300">{t.era}</span>
                  )}
                </div>

                <TrainComposition vehicles={vehicles} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
