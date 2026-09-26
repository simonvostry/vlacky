import { CollectionFilters } from "@/components/collection-filters";
import { facetOptions, matchesFilters, selectedFilters, vehicleFacets, type CollectionSearch, type FilterKey } from "@/lib/collection-filters";
import { groupVehicles } from "@/lib/wagon-variants";
import { vehicleSection } from "@/lib/vehicle-kind";
import { requireUser } from "@/lib/auth-guards";
import Image from "@/components/vehicle-image";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { ClassBadge } from "@/components/class-badge";
import { OperatorLogo } from "@/components/operator-logo";
import Link from "next/link";

const SCALE = 0.75;



export async function WagonCollection({ kind, searchParams }: { kind: "passenger" | "freight"; searchParams: Promise<CollectionSearch> }) {
  await requireUser();
  const allVehicles = await db
    .select()
    .from(schema.vehicles)
    .where(and(eq(schema.vehicles.type, "wagon"), eq(schema.vehicles.wagonKind, kind)))
    .orderBy(schema.vehicles.designation)
    .all();

  const catalog = kind === "passenger" ? await db.select({
    id: schema.vehicleCatalog.id, designation: schema.vehicleCatalog.designation,
    code: schema.vehicleCatalog.code, operator: schema.vehicleCatalog.operator,
    wagonFamily: schema.vehicleCatalog.wagonFamily,
  }).from(schema.vehicleCatalog).where(eq(schema.vehicleCatalog.type, "wagon")).all() : [];
  const selected = selectedFilters(await searchParams);
  const keys: FilterKey[] = kind === "passenger" ? ["op", "skupina", "rada"] : ["op", "rada"];
  const groups = groupVehicles(allVehicles);
  const facets = groups.map(g => vehicleFacets(g.vehicle, catalog));
  const visible = groups.filter((_, index) => matchesFilters(facets[index], selected, keys));

  return (
    <div>
      <CollectionFilters count={visible.length} total={groups.length} wagons filters={[
        { key: "op", label: "Dopravce", options: facetOptions(facets, "op") },
        ...(kind === "passenger" ? [{ key: "skupina" as const, label: "Konstrukční skupina", options: facetOptions(facets, "skupina") }] : []),
        { key: "rada", label: "Řada", options: facetOptions(facets, "rada") },
      ]} />
      {allVehicles.length === 0 ? (
        <p className="py-12 text-center text-secondary">
          Zatím žádné {kind === "freight" ? "nákladní" : "osobní"} vozy. Přidejte první!
        </p>
      ) : visible.length === 0 ? (
        <p className="py-12 text-center text-secondary">Žádné vozy neodpovídají vybraným filtrům.</p>
      ) : (
        <div className="flex flex-wrap gap-2" style={{ overflow: "auto" }}>
          {visible.map(({ vehicle: v, pieces, key }) => {
            const scaledW = Math.round((v.imageWidth || 264) * SCALE);
            const tileWidth = scaledW + 24;
            return (
              <Link
                key={key}
                href={`/${vehicleSection(v)}/${v.id}`}
                aria-label={`${[v.operator, v.designation].filter(Boolean).join(" ")} · ${pieces.filter(p => !p.isTemplate).length} ks`}
                className="group flex shrink-0 flex-col justify-center rounded border border-divider px-2 py-2 transition-colors hover:bg-accent-soft"
                style={{ width: tileWidth }}
              >
                {v.imagePath ? (
                  <div className="mb-1 flex items-end justify-center">
                    <Image unoptimized
                      src={v.imagePath}
                      alt={v.designation}
                      width={v.imageWidth || 264}
                      height={v.imageHeight || 41}
                      className="block shrink-0"
                      style={{
                        width: scaledW,
                        height: Math.round((v.imageHeight || 41) * SCALE),
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
                  {v.classType && (
                    <span data-vehicle-label="class" className="inline-flex"><ClassBadge classType={v.classType} size="xs" short /></span>
                  )}
                </div>
                <div className="mt-1 text-center text-xs tabular-nums text-secondary">
                  {pieces.filter(p => !p.isTemplate).length} ks{pieces.some(p => p.isTemplate) ? ' · předloha' : ''}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
