import { requireUser } from "@/lib/auth-guards";
import Image from "@/components/vehicle-image";
import React from "react";
import { db, schema } from "@/db";
import Link from "next/link";
import { OperatorLogo } from "@/components/operator-logo";

export const dynamic = "force-dynamic";

const SCALE = 0.75;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ typ?: string; barvy?: string; op?: string }>;
}) {
  await requireUser();
  const { typ, barvy, op } = await searchParams;
  const showColors = barvy === "1";

  const allEntries = await db
    .select()
    .from(schema.vehicleCatalog)
    .orderBy(
      schema.vehicleCatalog.wagonFamily,
      schema.vehicleCatalog.designation
    )
    .all();

  const entries = allEntries.filter((e) => {
    if (typ === "freight" && (e.type !== "wagon" || e.wagonKind !== "freight")) return false;
    if (typ === "wagon" && (e.type !== "wagon" || e.wagonKind !== "passenger")) return false;
    if (typ === "loco" && e.type !== "loco") return false;
    if (op) {
      if (op === "ČSD") {
        if (e.operator !== "ČSD" && e.operator !== "ČSD/ČD") return false;
      } else {
        if (e.operator !== op) return false;
      }
    }
    return true;
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
      <div className="mb-4 text-sm text-secondary">
        {entries.length} typů vozidel
      </div>

      {entries.length === 0 ? (
        <p className="py-12 text-center text-secondary">
          Pro vybrané filtry zatím nejsou v katalogu žádná vozidla.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2" style={{ overflow: "auto" }}>
          {entries.map((e) => {
            const images = imagesByCatalog.get(e.id) || [];
            const scaledW = Math.round((e.imageWidth || 264) * SCALE);
            const tileWidth = scaledW + 24;
            return (
              <Link
                key={e.id}
                href={`/katalog/${e.id}`}
                aria-label={`${e.operator} ${e.fullDesignation}`}
                className="group flex shrink-0 flex-col justify-center rounded border border-divider px-2 py-2 transition-colors hover:bg-accent-soft"
                style={{ width: tileWidth }}
              >
                {/* Header: operator + designation + badges */}
                <div className="mb-1 flex items-center justify-center gap-1 whitespace-nowrap text-[12px]" data-vehicle-label-row={showColors && images.length > 1 ? undefined : ""}>
                  <span data-vehicle-label="operator" className="inline-flex"><OperatorLogo operator={e.operator} height={12} /></span>
                  <span data-vehicle-label="type" className="font-bold">{e.fullDesignation}</span>
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
                  <div
                    className="mx-auto grid items-center gap-y-1.5 gap-x-1"
                    style={{
                      gridTemplateColumns: "1fr auto 1fr",
                    }}
                  >
                    {images.map((img) => {
                      const w = Math.round((img.imageWidth || 264) * SCALE);
                      const h = Math.round((img.imageHeight || 41) * SCALE);
                      return (
                        <React.Fragment key={img.id}>
                          <div />
                          <Image unoptimized
                            src={img.imagePath}
                            alt={`${e.fullDesignation} ${img.label || ""}`}
                            width={img.imageWidth || 264}
                            height={img.imageHeight || 41}
                            className="block shrink-0"
                            style={{ width: w, height: h, minWidth: w, maxWidth: "none" }}
                          />
                          <span className="text-[8px] leading-none text-secondary whitespace-nowrap self-center">
                            {img.label || ""}
                          </span>
                        </React.Fragment>
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
