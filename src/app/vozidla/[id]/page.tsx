import { EditAction } from "@/components/ui-actions";
import { VehicleDecoders } from "@/components/vehicle-decoders";
import { requireUser } from "@/lib/auth-guards";
import { VehicleDetailImage } from "@/components/vehicle-detail-image";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ClassBadge } from "@/components/class-badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function VehicleDetailPage({
  params,
}: {
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

  if (!vehicle) notFound();

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
    .all();

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href="/"
        className="mb-4 inline-block text-sm text-secondary hover:text-secondary"
      >
        &larr; Zpět na vozidla
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Main info */}
        <div className="min-w-0">
          <div className="rounded-lg border border-divider p-6">
            {vehicle.imagePath && (
              <div className="mb-6 overflow-x-auto rounded-lg bg-subtle p-6">
                <VehicleDetailImage src={vehicle.imagePath} alt={vehicle.designation}
                  width={(vehicle.imageWidth || 264) * 2} height={(vehicle.imageHeight || 41) * 2} center responsive={false} />
              </div>
            )}

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{vehicle.designation}</h1>
                <p data-vehicle-label="operator" className="text-secondary">{vehicle.operator}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${
                    vehicle.type === "loco"
                      ? "bg-primary text-white"
                      : "bg-muted text-secondary"
                  }`}
                >
                  {vehicle.type === "loco" ? "Lokomotiva" : "Vůz"}
                </span>
                <span data-vehicle-label="class" className="inline-flex"><ClassBadge classType={vehicle.classType} size="md" /></span>
              </div>
            </div>

            {vehicle.isTemplate && <p className="mt-3 text-xs font-medium text-warning">Ukázka / předloha · vynecháno z běžné synchronizace</p>}

            {vehicle.notes && (
              <p className="mt-4 text-sm text-secondary">{vehicle.notes}</p>
            )}

            <div className="mt-4">
              <EditAction href={`/vozidla/${vehicle.id}/upravit`} label="Upravit vozidlo" />
            </div>
          </div>


          <VehicleDecoders key={vehicleId} vehicleId={vehicleId} dccAddress={vehicle.dccAddress} />

          {/* Train appearances */}
          {appearances.length > 0 && (
            <div className="mt-6 rounded-lg border border-divider">
              <h2 className="border-b border-divider px-4 py-3 font-semibold">
                Zařazení ve vlacích
              </h2>
              <ul className="divide-y divide-divider">
                {appearances.map((a) => (
                  <li key={a.trainId}>
                    <Link
                      href={`/soupravy/${a.trainId}`}
                      className="flex items-center gap-2 px-4 py-3 hover:bg-subtle"
                    >
                      {a.trainCategory && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-bold text-foreground">
                          {a.trainCategory}
                        </span>
                      )}
                      <span className="font-medium">{a.trainNumber}</span>
                      {a.trainName && (
                        <span className="italic text-secondary">
                          {a.trainName}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-secondary">
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
          <div className="rounded-lg border border-divider p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase text-secondary">
              Parametry
            </h3>
            <dl className="space-y-2 text-sm">
              {vehicle.dccAddress && (
                <>
                  <dt className="text-secondary">DCC adresa</dt>
                  <dd className="font-mono font-bold">{vehicle.dccAddress}</dd>
                </>
              )}
              {vehicle.manufacturer && (
                <>
                  <dt className="text-secondary">Výrobce</dt>
                  <dd>{vehicle.manufacturer}</dd>
                </>
              )}
              {vehicle.catalogNumber && (
                <>
                  <dt className="text-secondary">Katalogové číslo</dt>
                  <dd className="font-mono">{vehicle.catalogNumber}</dd>
                </>
              )}
              {!vehicle.dccAddress &&
                !vehicle.manufacturer &&
                !vehicle.catalogNumber && (
                  <dd className="text-secondary">Zatím nevyplněno</dd>
                )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
