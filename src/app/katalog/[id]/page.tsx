import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DesignationDecoder } from "@/components/designation-decoder";

export const dynamic = "force-dynamic";

export default async function CatalogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entryId = parseInt(id, 10);
  if (isNaN(entryId)) notFound();

  const entry = await db
    .select()
    .from(schema.vehicleCatalog)
    .where(eq(schema.vehicleCatalog.id, entryId))
    .get();

  if (!entry) notFound();

  // Get all livery variants
  const images: {
    id: number;
    imagePath: string;
    imageWidth: number | null;
    imageHeight: number | null;
    label: string | null;
    sortOrder: number;
  }[] = await db
    .select()
    .from(schema.catalogImages)
    .where(eq(schema.catalogImages.catalogId, entryId))
    .orderBy(schema.catalogImages.sortOrder)
    .all();

  const fields: [string, string | null][] = [
    ["Označení", entry.fullDesignation],
    ["Operátor", entry.operator],
    ["Rodina", entry.wagonFamily === "CD_Y" ? "UIC-Y (24,5 m)" : "UIC-Z"],
    ["Třída", classLabel(entry.classType)],
    ["Číslo UIC", entry.uicNumber],
    ["Inventární čísla", entry.inventoryRange],
    ["Rok výroby", entry.yearBuilt],
    ["Výrobce", entry.manufacturer],
    ["Rok rekonstrukce", entry.yearReconstructed],
    ["Rekonstruoval", entry.reconstructor],
    ["Vyrobeno kusů", entry.unitsBuilt],
    ["V provozu", entry.unitsInService],
    ["Rok vyřazení", entry.yearRetired],
    ["Max. rychlost", entry.maxSpeed],
    ["Kód vozu", entry.vehicleCode],
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/katalog"
        className="mb-4 inline-block text-sm text-gray-400 hover:text-gray-600"
      >
        &larr; Zpět na katalog
      </Link>

      <div className="rounded-lg border border-gray-200 p-6">
        {images.length > 0 && (
          <div className="mb-6 space-y-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="flex items-end gap-3 rounded-lg bg-gray-50 p-4"
              >
                <img
                  src={img.imagePath}
                  alt={`${entry.fullDesignation} ${img.label || ""}`}
                  width={img.imageWidth || 264}
                  height={img.imageHeight || 41}
                  className="block"
                  style={{
                    width: img.imageWidth || 264,
                    height: img.imageHeight || 41,
                  }}
                />
                {img.label && (
                  <span className="text-xs text-gray-400">{img.label}</span>
                )}
              </div>
            ))}
          </div>
        )}

        <h1 className="text-2xl font-bold">{entry.fullDesignation}</h1>
        <p className="text-gray-500">{entry.operator}</p>

        <div className="mt-4 rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">
            Význam označení
          </h3>
          <DesignationDecoder designation={entry.designation} />
        </div>

        <dl className="mt-6 divide-y divide-gray-100">
          {fields.map(
            ([label, value]) =>
              value && (
                <div
                  key={label}
                  className="flex justify-between py-2 text-sm"
                >
                  <dt className="text-gray-400">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              )
          )}
        </dl>
      </div>
    </div>
  );
}

function classLabel(classType: string | null): string | null {
  if (!classType) return null;
  const map: Record<string, string> = {
    "1": "1. třída",
    "2": "2. třída",
    "12": "1. + 2. třída",
    restaurant: "Restaurační",
    sleeping: "Lůžkový",
    luggage: "Zavazadlový",
  };
  return map[classType] || classType;
}
