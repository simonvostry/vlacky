import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ClassBadge } from "@/components/class-badge";
import { DecoderFunctions } from "@/components/decoder-functions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vehicleId = parseInt(id, 10);
  if (isNaN(vehicleId)) notFound();

  const vehicle = await db
    .select()
    .from(schema.vehicles)
    .where(eq(schema.vehicles.id, vehicleId))
    .get();

  if (!vehicle) notFound();

  // Decoder functions
  const functions = await db
    .select()
    .from(schema.decoderFunctions)
    .where(eq(schema.decoderFunctions.vehicleId, vehicleId))
    .orderBy(schema.decoderFunctions.functionNumber)
    .all() as any[];

  // Trains this vehicle appears in
  const appearances = await db
    .select({
      trainId: schema.trains.id,
      trainNumber: schema.trains.number,
      trainName: schema.trains.name,
      trainCategory: schema.trains.category,
      position: schema.trainVehicles.position,
    })
    .from(schema.trainVehicles)
    .innerJoin(schema.trains, eq(schema.trainVehicles.trainId, schema.trains.id))
    .where(eq(schema.trainVehicles.vehicleId, vehicleId))
    .all() as any[];

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href="/vozy"
        className="mb-4 inline-block text-sm text-gray-400 hover:text-gray-600"
      >
        &larr; Zpět na vozidla
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Main info */}
        <div>
          <div className="rounded-lg border border-gray-200 p-6">
            {vehicle.imagePath && (
              <div className="mb-6 flex justify-center rounded-lg bg-gray-50 p-6">
                <img
                  src={vehicle.imagePath}
                  alt={vehicle.designation}
                  width={vehicle.imageWidth || 264}
                  height={vehicle.imageHeight || 41}
                  className="block"
                  style={{
                    width: vehicle.imageWidth || 264,
                    height: vehicle.imageHeight || 41,
                  }}
                />
              </div>
            )}

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{vehicle.designation}</h1>
                <p className="text-gray-500">{vehicle.operator}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${
                    vehicle.type === "loco"
                      ? "bg-gray-800 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {vehicle.type === "loco" ? "Lokomotiva" : "Vůz"}
                </span>
                <ClassBadge classType={vehicle.classType} size="md" />
              </div>
            </div>

            {vehicle.notes && (
              <p className="mt-4 text-sm text-gray-600">{vehicle.notes}</p>
            )}

            <div className="mt-4">
              <Link
                href={`/vozy/${vehicle.id}/upravit`}
                className="inline-block rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Upravit
              </Link>
            </div>
          </div>

          {/* Decoder functions */}
          <div className="mt-6">
            <DecoderFunctions vehicleId={vehicleId} functions={functions} />
          </div>

          {/* Train appearances */}
          {appearances.length > 0 && (
            <div className="mt-6 rounded-lg border border-gray-200">
              <h2 className="border-b border-gray-200 px-4 py-3 font-semibold">
                Zařazení ve vlacích
              </h2>
              <ul className="divide-y divide-gray-50">
                {appearances.map((a) => (
                  <li key={a.trainId}>
                    <Link
                      href={`/soupravy/${a.trainId}`}
                      className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50"
                    >
                      {a.trainCategory && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-bold text-gray-700">
                          {a.trainCategory}
                        </span>
                      )}
                      <span className="font-medium">{a.trainNumber}</span>
                      {a.trainName && (
                        <span className="italic text-gray-500">
                          {a.trainName}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-gray-400">
                        Pozice {a.position}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-400">
              Parametry
            </h3>
            <dl className="space-y-2 text-sm">
              {vehicle.dccAddress && (
                <>
                  <dt className="text-gray-400">DCC adresa</dt>
                  <dd className="font-mono font-bold">{vehicle.dccAddress}</dd>
                </>
              )}
              {vehicle.manufacturer && (
                <>
                  <dt className="text-gray-400">Výrobce</dt>
                  <dd>{vehicle.manufacturer}</dd>
                </>
              )}
              {vehicle.catalogNumber && (
                <>
                  <dt className="text-gray-400">Katalogové číslo</dt>
                  <dd className="font-mono">{vehicle.catalogNumber}</dd>
                </>
              )}
              {!vehicle.dccAddress &&
                !vehicle.manufacturer &&
                !vehicle.catalogNumber && (
                  <dd className="text-gray-400">Zatím nevyplněno</dd>
                )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
