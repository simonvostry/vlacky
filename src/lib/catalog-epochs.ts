import { db, schema } from '@/db';
import { and, eq } from 'drizzle-orm';

/** Call only after page authorization. Values come from the DB, never query-string epoch claims. */
export async function catalogEpochPrefill(catalogId?: string, imageId?: string) {
  if (!catalogId || !/^\d+$/.test(catalogId)) return { epochs: [], epochNotes: null };
  if (imageId) {
    if (!/^\d+$/.test(imageId)) return { epochs: [], epochNotes: null };
    const image = await db.select().from(schema.catalogImages).where(and(eq(schema.catalogImages.id,Number(imageId)),eq(schema.catalogImages.catalogId,Number(catalogId)))).get();
    return { epochs: image?.epochs ?? [], epochNotes: image?.epochNotes ?? null };
  }
  const entry = await db.select().from(schema.vehicleCatalog).where(eq(schema.vehicleCatalog.id,Number(catalogId))).get();
  return { epochs: entry?.epochs ?? [], epochNotes: entry?.epochNotes ?? null };
}
