import { CollectionFilters } from "@/components/collection-filters";
import { facetOptions, matchesFilters, selectedFilters, vehicleFacets, type CollectionSearch, type FilterKey } from "@/lib/collection-filters";
import { requireUser } from "@/lib/auth-guards";
import Image from "@/components/vehicle-image";
import { db, schema } from "@/db";
import Link from "next/link";
import { OperatorLogo } from "@/components/operator-logo";

export const dynamic = "force-dynamic";

const SCALE = 0.75;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<CollectionSearch & { typ?: string; barvy?: string }>;
}) {
  await requireUser();
  const search = await searchParams;
  const { typ, barvy } = search;
  const selected = selectedFilters(search);
  const showColors = barvy === "1";

  const allEntries = await db
    .select()
    .from(schema.vehicleCatalog)
    .orderBy(
      schema.vehicleCatalog.wagonFamily,
      schema.vehicleCatalog.designation
    )
    .all();

  const categoryEntries = allEntries.filter(e => {
    if (typ === "freight") return e.type === "wagon" && e.wagonKind === "freight";
    if (typ === "wagon") return e.type === "wagon" && e.wagonKind === "passenger";
    if (typ === "loco") return e.type === "loco";
    return true;
  });
  const keys: FilterKey[] = ["op", "rada"];
  if (!typ || typ === "loco") keys.push("pohon");
  if (!typ || typ === "wagon") keys.push("skupina");
  const facets = categoryEntries.map(e => vehicleFacets({
    ...e, catalogId: e.id,
    designation: e.code ? `${e.designation} ${e.code}` : e.designation,
  }, allEntries));
  const entries = categoryEntries.filter((e, index) => {
    if (keys.includes("pohon") && selected.pohon && e.type !== "loco") return false;
    if (keys.includes("skupina") && selected.skupina && (e.type !== "wagon" || e.wagonKind !== "passenger")) return false;
    // Preserve the existing ČSD catalog filter's inclusion of shared ČSD/ČD entries.
    const facet = selected.op === "ČSD" && facets[index].op === "ČSD/ČD" ? { ...facets[index], op: "ČSD" } : facets[index];
    return matchesFilters(facet, selected, keys);
  });

  // Load catalog images grouped by catalogId (only when showing colors)
  const imagesByCatalog = new Map<number, typeof allCatalogImages>();
  let allCatalogImages: {
    id: number;
    catalogId: number;
    imagePath: string;
    imageWidth: number | null;
    imageHeight: number | null;
    label: string | null;
    sortOrder: number;
    sourceUrl: string | null;
  }[] = [];

  if (showColors) {
    allCatalogImages = await db
      .select()
      .from(schema.catalogImages)
      .orderBy(schema.catalogImages.catalogId, schema.catalogImages.sortOrder)
      .all();

    for (const img of allCatalogImages) {
      const existing = imagesByCatalog.get(img.catalogId) || [];
      existing.push(img);
      imagesByCatalog.set(img.catalogId, existing);
    }
  }

  return (
    <div>
      <CollectionFilters count={entries.length} total={categoryEntries.length} catalog filters={[
        { key: "op", label: "Dopravce", options: facetOptions(facets, "op") },
        ...(keys.includes("pohon") ? [{ key: "pohon" as const, label: "Pohon", options: facetOptions(facets.filter((_, i) => categoryEntries[i].type === "loco"), "pohon") }] : []),
        ...(keys.includes("skupina") ? [{ key: "skupina" as const, label: "Konstrukční skupina", options: facetOptions(facets.filter((_, i) => categoryEntries[i].type === "wagon" && categoryEntries[i].wagonKind === "passenger"), "skupina") }] : []),
        { key: "rada", label: "Řada", options: facetOptions(facets, "rada") },
      ]} />

      {entries.length === 0 ? (
        <p className="py-12 text-center text-secondary">
          Pro vybrané filtry zatím nejsou v katalogu žádná vozidla.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2" style={{ overflow: "auto" }}>
          {entries.map((e) => {
            const images = imagesByCatalog.get(e.id) || [];
            const scaledW = Math.round((e.imageWidth || 264) * SCALE);
            const tileWidth = Math.max(scaledW, ...images.map(img => Math.round((img.imageWidth || 264) * SCALE))) + 24;
            return (
              <Link
                key={e.id}
                href={`/katalog/${e.id}`}
                aria-label={`${e.operator} ${e.fullDesignation}`}
                className="group flex shrink-0 flex-col rounded border border-divider px-2 py-2 transition-colors hover:bg-accent-soft"
                style={{ width: tileWidth }}
              >
                {/* Header: operator + designation + badges */}
                <div className="mb-1 flex flex-wrap items-center justify-center gap-1 text-center text-[12px]" data-vehicle-label-row={showColors && images.length > 1 ? undefined : ""}>
                  <span data-vehicle-label="operator" className="inline-flex"><OperatorLogo operator={e.operator} height={12} /></span>
                  <span data-vehicle-label="type" className="min-w-0 [overflow-wrap:anywhere] font-bold">{e.fullDesignation}</span>
                  {e.classType === "1" && (
                    <span data-vehicle-label="class" className="rounded bg-amber-400 px-1 py-0 text-[9px] font-bold text-amber-900">1</span>
                  )}
                  {e.classType === "2" && (
                    <span data-vehicle-label="class" className="rounded bg-blue-500 px-1 py-0 text-[9px] font-bold text-white">2</span>
                  )}
                  {e.classType === "12" && (
                    <span data-vehicle-label="class" className="rounded bg-purple-500 px-1 py-0 text-[9px] font-bold text-white">1/2</span>
                  )}
                  {e.classType === "restaurant" && (
                    <span data-vehicle-label="class" className="rounded bg-red-600 px-1 py-0 text-[9px] font-bold text-white">R</span>
                  )}
                  {e.classType === "sleeping" && (
                    <span data-vehicle-label="class" className="rounded bg-indigo-600 px-1 py-0 text-[9px] font-bold text-white">L</span>
                  )}
                  {e.classType === "couchette" && (
                    <span data-vehicle-label="class" className="rounded bg-indigo-600 px-1 py-0 text-[9px] font-bold text-white">Le</span>
                  )}
                  {e.classType === "luggage" && (
                    <span data-vehicle-label="class" className="rounded bg-muted px-1 py-0 text-[9px] font-bold text-secondary">Z</span>
                  )}
                  {showColors && images.length > 1 && (
                    <span className="text-[9px] text-secondary">
                      {images.length}×
                    </span>
                  )}
                </div>

                {/* All livery variants stacked */}
                {images.length > 0 ? (
                  <div className="flex w-full min-w-0 flex-col gap-3">
                    {images.map((img) => {
                      const w = Math.round((img.imageWidth || 264) * SCALE);
                      const h = Math.round((img.imageHeight || 41) * SCALE);
                      return (
                        <figure key={img.id} className="flex min-w-0 flex-col items-center gap-1">
                          <Image unoptimized
                            src={img.imagePath}
                            alt={`${e.fullDesignation} ${img.label || ""}`}
                            width={img.imageWidth || 264}
                            height={img.imageHeight || 41}
                            className="block shrink-0"
                            style={{ width: w, height: h, minWidth: w, maxWidth: "none" }}
                          />
                          {img.label && (
                            <figcaption className="w-full text-center text-[10px] leading-snug text-secondary [overflow-wrap:anywhere]">
                              {img.label}
                            </figcaption>
                          )}
                        </figure>
                      );
                    })}
                  </div>
                ) : e.imagePath ? (
                  <div className="flex h-10 items-end justify-center">
                    <Image unoptimized
                      src={e.imagePath}
                      alt={e.fullDesignation}
                      width={e.imageWidth || 264}
                      height={e.imageHeight || 41}
                      className="block shrink-0"
                      style={{
                        width: scaledW,
                        height: Math.round((e.imageHeight || 41) * SCALE),
                        minWidth: scaledW,
                        maxWidth: "none",
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex h-8 items-end justify-center text-[10px] text-secondary">
                    bez obrázku
                  </div>
                )}

                {/* Footer: speed + count */}
                {(e.maxSpeed || e.unitsInService) && (
                  <div className="mt-1 text-center text-[10px] text-secondary">
                    {e.maxSpeed && <span>{e.maxSpeed}</span>}
                    {e.maxSpeed && e.unitsInService && <span> · </span>}
                    {e.unitsInService && (
                      <span>{e.unitsInService} v provozu</span>
                    )}
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
