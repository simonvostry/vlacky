import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth-guards';
import { DesignationDecoder } from '@/components/designation-decoder';

/** Prototype facts stay on the catalog; physical model configuration stays on vehicles. */
export async function OwnedCatalogDetails({ catalogId }: { catalogId: number | null }) {
  if (catalogId == null) return null;
  await requireUser();
  const entry = await db.select().from(schema.vehicleCatalog).where(eq(schema.vehicleCatalog.id, catalogId)).get();
  if (!entry) return null;
  const passenger = entry.type === 'wagon' && entry.wagonKind === 'passenger';
  const facts = [
    ['Rok výroby', entry.yearBuilt],
    ['Max. rychlost', entry.maxSpeed],
    ['Výrobce předlohy', entry.manufacturer],
  ].filter(([, value]) => value);

  return <div className="mt-4 border-t border-divider pt-4" data-catalog-details>
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary">Skutečné vozidlo</h2>
      <Link href={`/katalog/${entry.id}`} className="text-xs text-accent hover:underline">{entry.fullDesignation} v katalogu &rarr;</Link>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      {passenger && <div data-vehicle-label="type"><DesignationDecoder designation={entry.designation} operator={entry.operator} /></div>}
      {facts.length > 0 && <dl className="flex flex-wrap content-start gap-x-8 gap-y-3 text-sm">
        {facts.map(([label, value]) => <div key={label}>
          <dt className="text-xs text-secondary">{label}</dt>
          <dd className="mt-1 font-medium">{value}</dd>
        </div>)}
      </dl>}
    </div>
  </div>;
}
