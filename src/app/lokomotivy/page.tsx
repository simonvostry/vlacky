import { CollectionFilters } from "@/components/collection-filters";
import { facetOptions, matchesFilters, selectedFilters, vehicleFacets, type CollectionSearch, type FilterKey } from "@/lib/collection-filters";
import { requireUser } from "@/lib/auth-guards";
import Image from "@/components/vehicle-image";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { OperatorLogo } from "@/components/operator-logo";
import Link from "next/link";

const SCALE = 0.75;

export const dynamic = "force-dynamic";

export default async function LokomotivyPage({ searchParams }: { searchParams: Promise<CollectionSearch> }) {
  await requireUser();
  const allVehicles = await db
    .select()
    .from(schema.vehicles)
    .where(eq(schema.vehicles.type, "loco"))
    .orderBy(schema.vehicles.designation)
    .all();

  const selected = selectedFilters(await searchParams);
  const keys: FilterKey[] = ["op", "pohon", "rada"];
  const facets = allVehicles.map(v => vehicleFacets(v));
  const visible = allVehicles.filter((_, index) => matchesFilters(facets[index], selected, keys));

  return (
    <div>
      <CollectionFilters count={visible.length} total={allVehicles.length} filters={[
        { key: "op", label: "Dopravce", options: facetOptions(facets, "op") },
        { key: "pohon", label: "Pohon", options: facetOptions(facets, "pohon") },
        { key: "rada", label: "Řada", options: facetOptions(facets, "rada") },
      ]} />
      {allVehicles.length === 0 ? (
        <p className="py-12 text-center text-secondary">
          Zatím žádné lokomotivy. Přidejte první!
        </p>
      ) : visible.length === 0 ? (
        <p className="py-12 text-center text-secondary">Žádné lokomotivy neodpovídají vybraným filtrům.</p>
      ) : (
        <div className="flex flex-wrap gap-2" style={{ overflow: "auto" }}>
          {visible.map((v) => {
            const scaledW = Math.round((v.imageWidth || 169) * SCALE);
            const tileWidth = scaledW + 24;
            return (
              <Link
                key={v.id}
                href={`/lokomotivy/${v.id}`}
                aria-label={[v.operator, v.designation].filter(Boolean).join(" ")}
                className="group flex shrink-0 flex-col justify-center rounded border border-divider px-2 py-2 transition-colors hover:bg-accent-soft"
                style={{ width: tileWidth }}
              >
                {v.imagePath ? (
                  <div className="mb-1 flex items-end justify-center">
                    <Image unoptimized
                      src={v.imagePath}
                      alt={v.designation}
                      width={v.imageWidth || 169}
                      height={v.imageHeight || 58}
                      className="block shrink-0"
                      style={{
                        width: scaledW,
                        height: Math.round((v.imageHeight || 58) * SCALE),
                        maxWidth: "none",
                      }}
                    />
                  </div>
                ) : (
                  <div className="mb-1 text-center text-[10px] text-secondary">bez obrázku</div>
                )}
                <div data-vehicle-label-row className="flex items-center justify-center gap-1 whitespace-nowrap">
                  <span data-vehicle-label="operator" className="inline-flex"><OperatorLogo operator={v.operator} height={12} /></span>
                  <span data-vehicle-label="type" className="text-[12px] font-bold">{v.designation}</span>
                </div>
                {v.dccAddress && (
                  <div className="text-center text-[10px] text-secondary">
                    DCC: {v.dccAddress}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
