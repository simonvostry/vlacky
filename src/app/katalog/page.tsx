import React from "react";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { OperatorLogo } from "@/components/operator-logo";

export const dynamic = "force-dynamic";

const SCALE = 0.75;
const WIDE_THRESHOLD = 350;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ typ?: string; barvy?: string }>;
}) {
  const { typ, barvy } = await searchParams;
  const showColors = barvy === "1";

  let query = db
    .select()
    .from(schema.vehicleCatalog);

  const allEntries = query
    .orderBy(
      schema.vehicleCatalog.wagonFamily,
      schema.vehicleCatalog.designation
    )
    .all();

  const entries = typ
    ? allEntries.filter((e) => e.type === typ)
    : allEntries;

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
    allCatalogImages = db
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
      <div className="mb-4 text-sm text-gray-400">
        {entries.length} typů vozidel
      </div>

      {entries.length === 0 ? (
        <p className="py-12 text-center text-gray-400">
          Katalog je prázdný. Spusťte <code>npm run db:scrape</code>.
        </p>
      ) : (
        <div className={`grid gap-2 ${showColors ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"}`}>
          {entries.map((e) => {
            const images = imagesByCatalog.get(e.id) || [];
            const isWide = (e.imageWidth || 0) > WIDE_THRESHOLD;
            return (
              <Link
                key={e.id}
                href={`/katalog/${e.id}`}
                className={`group rounded border border-gray-100 px-2 py-2 transition-colors hover:bg-blue-50 ${isWide ? "col-span-2" : ""}`}
              >
                {/* Header: operator + designation + badges */}
                <div className="mb-1 flex items-center justify-center gap-1 whitespace-nowrap text-[12px]">
                  <OperatorLogo operator={e.operator} height={12} />
                  <span className="font-bold">{e.fullDesignation}</span>
                  {e.classType === "1" && (
                    <span className="rounded bg-amber-400 px-1 py-0 text-[9px] font-bold text-amber-900">1</span>
                  )}
                  {e.classType === "2" && (
                    <span className="rounded bg-blue-500 px-1 py-0 text-[9px] font-bold text-white">2</span>
                  )}
                  {e.classType === "12" && (
                    <span className="rounded bg-purple-500 px-1 py-0 text-[9px] font-bold text-white">1/2</span>
                  )}
                  {e.classType === "restaurant" && (
                    <span className="rounded bg-red-600 px-1 py-0 text-[9px] font-bold text-white">R</span>
                  )}
                  {e.classType === "sleeping" && (
                    <span className="rounded bg-indigo-600 px-1 py-0 text-[9px] font-bold text-white">L</span>
                  )}
                  {showColors && images.length > 1 && (
                    <span className="text-[9px] text-gray-300">
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
                          <img
                            src={img.imagePath}
                            alt={`${e.fullDesignation} ${img.label || ""}`}
                            width={img.imageWidth || 264}
                            height={img.imageHeight || 41}
                            className="block"
                            style={{ width: w, height: h }}
                          />
                          <span className="text-[8px] leading-none text-gray-300 whitespace-nowrap self-center">
                            {img.label || ""}
                          </span>
                        </React.Fragment>
                      );
                    })}
                  </div>
                ) : e.imagePath ? (
                  <div className="flex h-10 items-end justify-center">
                    <img
                      src={e.imagePath}
                      alt={e.fullDesignation}
                      width={e.imageWidth || 264}
                      height={e.imageHeight || 41}
                      className="block"
                      style={{
                        width: Math.round((e.imageWidth || 264) * SCALE),
                        height: Math.round((e.imageHeight || 41) * SCALE),
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex h-8 items-end justify-center text-[10px] text-gray-300">
                    bez obrázku
                  </div>
                )}

                {/* Footer: speed + count */}
                {(e.maxSpeed || e.unitsInService) && (
                  <div className="mt-1 text-center text-[10px] text-gray-400">
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
