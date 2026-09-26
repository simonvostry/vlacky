import { ManufacturerLogo } from "@/components/manufacturer-logo";
import { EditAction } from "@/components/ui-actions";
import { SpeedProfileEditor } from "@/components/speed-profile-editor";
import { getSpeedProfile } from "@/lib/speed-profile-storage";
import { VehicleDecoders } from "@/components/vehicle-decoders";
import { requireUser } from "@/lib/auth-guards";
import { VehicleDetailImage } from "@/components/vehicle-detail-image";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { OperatorLogo } from "@/components/operator-logo";
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

      <section className="entity-header space-y-4" aria-label="Přehled lokomotivy">
        {vehicle.imagePath && <div className="image-stage min-w-0 rounded-lg p-4" data-locomotive-image>
          <VehicleDetailImage src={vehicle.imagePath} alt={vehicle.designation}
                  width={(vehicle.imageWidth || 264) * 2} height={(vehicle.imageHeight || 41) * 2} />
        </div>}
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{vehicle.designation}</h1>
                <span className="rounded bg-primary px-2 py-0.5 text-xs font-medium uppercase text-white">{vehicle.type === "loco" ? "Lokomotiva" : "Vůz"}</span>
                <span data-vehicle-label="class" className="inline-flex"><ClassBadge classType={vehicle.classType} size="md" /></span>
              </div>
              <div data-vehicle-label="operator" className="mt-2"><OperatorLogo operator={vehicle.operator} height={16} /></div>
            </div>
            <EditAction href={`/lokomotivy/${vehicle.id}/upravit`} label="Upravit lokomotivu" />
          </div>
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-secondary">Patinováno</dt><dd>{vehicle.isWeathered ? "Ano" : "Ne"}</dd></div>
            <div><dt className="text-secondary">DCC adresa</dt><dd className="font-mono font-medium">{vehicle.dccAddress ?? "Nevyplněna"}</dd></div>
            {vehicle.manufacturer && <div><dt className="text-secondary">Výrobce</dt><dd className="flex min-h-6 items-center"><ManufacturerLogo manufacturer={vehicle.manufacturer} /></dd></div>}
            {vehicle.catalogNumber && <div><dt className="text-secondary">Katalogové číslo</dt><dd className="break-all font-mono">{vehicle.catalogNumber}</dd></div>}
          </dl>
          {vehicle.isTemplate && <p className="mt-3 text-xs font-medium text-warning">Ukázka / předloha · vynecháno z běžné synchronizace</p>}
          {vehicle.notes && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-secondary">{vehicle.notes}</p>}
        </div>

      </section>

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
