import { getDecoders } from "@/lib/decoder-storage";
import { requireUser } from "@/lib/auth-guards";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { TrainDetailsPanel } from "@/components/train-details-panel";
import { TrainComposition } from "@/components/train-composition";

export const dynamic = "force-dynamic";

export default async function TrainsPage({ searchParams }: {
  searchParams: Promise<{ souprava?: string }>;
}) {
  await requireUser();
  const decoders = await getDecoders();
  const { souprava } = await searchParams;
  const allTrains = await db
    .select()
    .from(schema.trains)
    .orderBy(schema.trains.category, schema.trains.number)
    .all();

  // Load all train vehicles with their vehicle data, grouped by train
  const allTrainVehicles = await db
    .select({
      trainId: schema.trainVehicles.trainId,
      position: schema.trainVehicles.position,
      notes: schema.trainVehicles.notes,
      vehicle: {
        id: schema.vehicles.id,
        designation: schema.vehicles.designation,
        operator: schema.vehicles.operator,
        type: schema.vehicles.type,
        classType: schema.vehicles.classType,
        imagePath: schema.vehicles.imagePath,
        imageWidth: schema.vehicles.imageWidth,
        imageHeight: schema.vehicles.imageHeight,
        manufacturer: schema.vehicles.manufacturer,
        catalogNumber: schema.vehicles.catalogNumber,
        dccAddress: schema.vehicles.dccAddress,
      },
    })
    .from(schema.trainVehicles)
    .innerJoin(
      schema.vehicles,
      eq(schema.trainVehicles.vehicleId, schema.vehicles.id)
    )
    .orderBy(schema.trainVehicles.position)
    .all();

  const vehiclesByTrain = new Map<number, typeof allTrainVehicles>();
  for (const tv of allTrainVehicles) {
    const existing = vehiclesByTrain.get(tv.trainId) || [];
    existing.push(tv);
    vehiclesByTrain.set(tv.trainId, existing);
  }

  const selectedTrain = allTrains.find(train => String(train.id) === souprava);
  const selectedVehicles = selectedTrain ? vehiclesByTrain.get(selectedTrain.id) || [] : [];

  return (
    <div className={selectedTrain ? "grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]" : "min-w-0"}>
      <div className="min-w-0">
        {allTrains.length === 0 ? (
          <p className="py-12 text-center text-secondary">Zatím žádné vlaky. Přidejte první!</p>
        ) : allTrains.map(train => {
          const vehicles = vehiclesByTrain.get(train.id) || [];
          const selected = selectedTrain?.id === train.id;
          return (
            <div key={train.id}>
              <div className={`my-1 overflow-x-auto rounded-lg transition-colors ${selected ? "bg-muted" : "hover:bg-subtle"}`}>
                <Link
                  href={`/soupravy?souprava=${train.id}`}
                  scroll={false}
                  aria-current={selected ? "true" : undefined}
                  aria-label={`Zobrazit soupravu ${[train.category, train.number, train.name].filter(Boolean).join(" ")}`}
                  className="block rounded-lg px-3 py-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                >
                  <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    {train.category && <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-bold text-secondary">{train.category}</span>}
                    <span className="text-sm font-bold">{train.number}</span>
                    {train.name && <span className="text-sm italic text-secondary">{train.name}</span>}
                    {train.route && <span className="text-xs text-secondary">{train.route}</span>}
                    {train.era && <span className="text-xs text-secondary">{train.era}</span>}
                  </div>
                  <div className="w-max min-w-full"><TrainComposition vehicles={vehicles} showDescriptions={false} useDisplayPreferences /></div>
                </Link>
              </div>
              {selected && (
                <div className="my-3 md:hidden">
                  <TrainDetailsPanel decoders={decoders} train={train} vehicles={vehicles} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {selectedTrain && (
        <aside key={selectedTrain.id} className="sticky top-32 hidden max-h-[calc(100dvh-9rem)] min-w-0 overflow-y-auto overscroll-contain pb-1 md:block xl:top-16 xl:max-h-[calc(100dvh-5rem)]">
          <TrainDetailsPanel decoders={decoders} train={selectedTrain} vehicles={selectedVehicles} />
        </aside>
      )}
    </div>
  );
}
