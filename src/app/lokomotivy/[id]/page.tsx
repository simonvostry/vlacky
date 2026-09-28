import { OwnedVehicleHeader } from '@/components/owned-vehicle-header';
import { SpeedProfileEditor } from "@/components/speed-profile-editor";
import { getSpeedProfile } from "@/lib/speed-profile-storage";
import { VehicleDecoders } from "@/components/vehicle-decoders";
import { requireUser } from "@/lib/auth-guards";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
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

  const speedProfile = vehicle.type === "loco" ? await getSpeedProfile(vehicleId) : null;

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
      <Link href="/lokomotivy" className="mb-4 inline-block text-sm text-secondary hover:text-secondary">
        &larr; Zpět na lokomotivy
      </Link>

      <OwnedVehicleHeader vehicle={vehicle} />
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-secondary">
        <span>Patinováno: {vehicle.isWeathered ? 'Ano' : 'Ne'}</span>
        <span>DCC adresa: {vehicle.dccAddress ?? 'Nevyplněna'}</span>
      </div>
      {vehicle.isTemplate && <p className="mt-3 text-xs text-warning">Ukázka / předloha · vynecháno z běžné synchronizace</p>}
      {vehicle.notes && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-secondary">{vehicle.notes}</p>}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-2" data-locomotive-config>
        <div className="min-w-0 space-y-6 [&>section]:mt-0">
          <VehicleDecoders key={vehicleId} vehicleId={vehicleId} dccAddress={vehicle.dccAddress} />
          {/* Train appearances */}
          {appearances.length > 0 && (
            <div className="rounded-lg border border-divider">
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
        {vehicle.type === "loco" && <div className="min-w-0 [&>section]:mt-0">
          <SpeedProfileEditor vehicleId={vehicleId} initial={speedProfile} />
        </div>}
      </div>
    </div>
  );
}
