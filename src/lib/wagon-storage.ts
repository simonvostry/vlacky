import { z } from 'zod';
import { allowsVehicleEditField, type WagonEditMode, wagonModelFields, vehiclePieceFields } from './vehicle-edit-fields';
import type { Transaction, InValue } from '@libsql/client';
import { withWriteTransaction } from '@/db';

export class CollectionError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const nullableText = z.string().nullable().transform(v => v || null);
const nullableId = z.number().int().positive().nullable();
const epochsSchema = z.array(z.number().int().min(1).max(6)).max(6).refine(v => new Set(v).size === v.length).transform(v => [...v].sort((a,b) => a-b));
const patchSchema = z.object({
  description: z.string().max(5000).nullable().transform(v => v?.trim() || null), referenceNotes: z.string().max(30000).nullable().transform(v => v?.trim() || null),
  designation: z.string().trim().min(1), operator: nullableText, type: z.enum(['wagon', 'loco']),
  wagonKind: z.enum(['passenger', 'freight']), classType: nullableText,
  imagePath: nullableText, imageWidth: nullableId, imageHeight: nullableId,
  epochs: epochsSchema, epochNotes: z.string().max(5000).nullable().transform(v => v?.trim() || null),
  lengthOverBuffersMm: z.number().finite().positive().max(10000).nullable(),
  manufacturer: nullableText, catalogNumber: nullableText, catalogId: nullableId, catalogImageId: nullableId,
  dccAddress: z.number().int().min(1).max(10239).nullable(), isTemplate: z.boolean(), notes: nullableText,
  magneticCouplerA: z.boolean(), magneticCouplerB: z.boolean(), hasTailLights: z.boolean(),
  hasSoundDecoder: z.boolean(), hasSpeaker: z.boolean(), isWeathered: z.boolean(),
  magneticCouplers: z.boolean().nullable(), hasLights: z.boolean().nullable().transform(v => v ?? false), runningNumber: nullableText,
}).partial();
const shared: Record<(typeof wagonModelFields)[number], string> = {
  description: 'description', designation: 'designation', operator: 'operator', type: 'type', wagonKind: 'wagon_kind', classType: 'class_type',
  imagePath: 'image_path', imageWidth: 'image_width', imageHeight: 'image_height', manufacturer: 'manufacturer',
  epochs: 'epochs', epochNotes: 'epoch_notes',
  lengthOverBuffersMm: 'length_over_buffers_mm',
  catalogNumber: 'catalog_number', catalogId: 'catalog_id', catalogImageId: 'catalog_image_id',
};
const physical: Record<(typeof vehiclePieceFields)[number], string> = { referenceNotes: 'reference_notes', magneticCouplerA: 'magnetic_coupler_a', magneticCouplerB: 'magnetic_coupler_b', hasTailLights: 'has_tail_lights', hasSoundDecoder: 'has_sound_decoder', hasSpeaker: 'has_speaker', isWeathered: 'is_weathered', dccAddress: 'dcc_address', isTemplate: 'is_template', notes: 'notes', magneticCouplers: 'magnetic_couplers', hasLights: 'has_lights', runningNumber: 'running_number' };
type Row = Record<string, unknown>;
function values(patch: Record<string, unknown>, mapping: Record<string, string>) {
  return Object.entries(mapping).filter(([key]) => patch[key] !== undefined).map(([key, column]) => [column, Array.isArray(patch[key]) ? JSON.stringify(patch[key]) : typeof patch[key] === 'boolean' ? Number(patch[key]) : patch[key]] as [string, InValue]);
}
async function update(tx: Transaction, entries: [string, InValue][], where: string, id: number) {
  if (entries.length) await tx.execute({ sql: `UPDATE vehicles SET ${entries.map(([k]) => `${k} = ?`).join(', ')} WHERE ${where} = ?`, args: [...entries.map(([,v]) => v), id] });
}
async function newVariant(tx: Transaction) {
  return Number((await tx.execute('INSERT INTO wagon_variants DEFAULT VALUES RETURNING id')).rows[0].id);
}
async function insert(tx: Transaction, entries: [string, InValue][]) {
  const result = await tx.execute({ sql: `INSERT INTO vehicles (${entries.map(([k]) => k).join(',')},created_at) VALUES (${entries.map(() => '?').join(',')},?) RETURNING id`, args: [...entries.map(([,v]) => v),new Date().toISOString()] });
  return Number(result.rows[0].id);
}
async function copyMany(tx: Transaction, source: Row, variantId: number, count: number) {
  if (count <= 0) return;
  const entries: [string, InValue][] = [...Object.values(shared).map(k => [k, source[k] as InValue] as [string, InValue]), ['has_lights',0],['wagon_variant_id',variantId],['is_template',source.is_template as InValue],['created_at',new Date().toISOString()]];
  await tx.execute({sql:`WITH RECURSIVE copies(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM copies WHERE n < ?)
    INSERT INTO vehicles (${entries.map(([k])=>k).join(',')}) SELECT ${entries.map(()=>'?').join(',')} FROM copies`,args:[count,...entries.map(([,v])=>v)]});
}
function parsePatch(body: unknown) {
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success && parsed.error.issues.some(issue => issue.path[0] === 'lengthOverBuffersMm')) {
    throw new CollectionError('Délka přes nárazníky musí být kladné číslo v mm (nejvýše 10 000), nebo zůstat prázdná.');
  }
  if (!parsed.success) throw new CollectionError('Neplatné údaje vozidla. Zkontrolujte označení, druh, rozměry a DCC adresu (1–10239).');
  return parsed.data;
}
export async function saveVehicle(body: Record<string, unknown>, id?: number, transaction?: Transaction) {
  const patch = parsePatch(body);
  const mode = body.editMode;
  if (mode !== undefined) {
    if (id === undefined || (mode !== 'model' && mode !== 'piece') || body.editScope !== undefined) {
      throw new CollectionError('Neplatný editor vozu.');
    }
    if (Object.keys(patch).some(key => !allowsVehicleEditField(mode as WagonEditMode, key))) {
      throw new CollectionError(mode === 'piece' ? 'Editor kusu ukládá pouze jeho číslo, DCC a výbavu.' : 'Editor varianty ukládá pouze společné údaje modelu.');
    }
  }
  // Compatibility with older clients: a non-null whole-wagon setting sets both ends.
  // Explicit end settings take precedence; omitted/null legacy values never clear them.
  if (patch.magneticCouplerA === undefined && patch.magneticCouplerB === undefined && patch.magneticCouplers != null) {
    patch.magneticCouplerA = patch.magneticCouplers;
    patch.magneticCouplerB = patch.magneticCouplers;
  }
  if (body.editScope !== undefined && !['piece','variant','new-variant'].includes(String(body.editScope))) throw new CollectionError('Neplatný rozsah úpravy.');
  const work = async (tx: Transaction) => {
    if (id === undefined) {
      patch.hasLights ??= false;
      patch.epochs ??= [];
      if (!patch.designation || !patch.type) throw new CollectionError('Vyplňte označení a typ vozidla.');
      const quantity = body.quantity ?? 1;
      if (!Number.isInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 1000 || (patch.type !== 'wagon' && quantity !== 1)) throw new CollectionError('Počet kusů musí být 1–1000; lokomotivy přidávejte jednotlivě.');
      let variantId: number | null = null;
      if (patch.type === 'wagon') {
        // Reuse only an exact catalog/model/artwork match. Unpictured models remain separate.
        const match = { ...patch, wagonKind: patch.wagonKind ?? 'passenger' };
        const entries = values(Object.fromEntries(Object.keys(shared).map(k => [k, match[k as keyof typeof match] ?? null])), shared);
        const existing = patch.imagePath ? (await tx.execute({ sql: `SELECT wagon_variant_id FROM vehicles WHERE ${entries.map(([k]) => `${k} IS ?`).join(' AND ')} AND is_template = ? AND wagon_variant_id IS NOT NULL LIMIT 1`, args: [...entries.map(([,v]) => v),Number(patch.isTemplate ?? false)] })).rows[0] : null;
        variantId = existing ? Number(existing.wagon_variant_id) : await newVariant(tx);
      }
      if (patch.magneticCouplerA !== undefined || patch.magneticCouplerB !== undefined) {
        const a = patch.magneticCouplerA ?? false, b = patch.magneticCouplerB ?? false;
        patch.magneticCouplers = a === b ? a : null;
      }
      const created = await insert(tx, [...values(patch,shared),...values(patch,physical),['wagon_variant_id',variantId]]);
      const source = (await tx.execute({sql:'SELECT * FROM vehicles WHERE id = ?',args:[created]})).rows[0];
      await copyMany(tx, source, variantId!, Number(quantity)-1);
      return created;
    }
    const old = (await tx.execute({sql:'SELECT * FROM vehicles WHERE id = ?',args:[id]})).rows[0];
    if (!old) throw new CollectionError('Vozidlo nenalezeno.',404);
    if (mode !== undefined && old.type !== 'wagon') throw new CollectionError('Tento editor je určen pro vozy.');
    if (mode === 'model' && (patch.catalogId !== undefined || patch.catalogImageId !== undefined)) {
      const catalogId = patch.catalogId === undefined ? old.catalog_id : patch.catalogId;
      const imageId = patch.catalogImageId === undefined ? old.catalog_image_id : patch.catalogImageId;
      if (catalogId != null && !(await tx.execute({sql:'SELECT id FROM vehicle_catalog WHERE id=?',args:[catalogId as InValue]})).rows.length) {
        throw new CollectionError('Katalogová předloha neexistuje.');
      }
      if (imageId != null && (catalogId == null || !(await tx.execute({sql:'SELECT id FROM catalog_images WHERE id=? AND catalog_id=?',args:[imageId as InValue,catalogId as InValue]})).rows.length)) {
        throw new CollectionError('Barevná varianta nepatří k vybrané katalogové předloze.');
      }
    }
    if (patch.epochs !== undefined && JSON.stringify(patch.epochs) !== old.epochs && patch.epochNotes === undefined) patch.epochNotes = null;
    const entries = values(patch,shared);
    const changed = entries.some(([k,v]) => old[k] !== v);
    const nextType = patch.type ?? old.type;
    // Shared model fields always belong to the variant, including edits from
    // older clients that still send editScope:"piece". Never split implicitly.
    const detach = body.editScope === 'new-variant';
    const variantId = old.wagon_variant_id as number | null;
    if (detach && (old.type !== 'wagon' || nextType !== 'wagon' || !changed)) {
      throw new CollectionError('Nová varianta vyžaduje změnu údajů nebo vzhledu vozu.');
    }
    if (variantId && nextType !== 'wagon' && Number((await tx.execute({sql:'SELECT count(*) AS n FROM vehicles WHERE wagon_variant_id = ?',args:[variantId]})).rows[0].n) > 1) {
      throw new CollectionError('Skupinu více vozů nelze změnit na lokomotivu.');
    }
    if (variantId && nextType === 'wagon' && !detach) {
      await update(tx,entries,'wagon_variant_id',variantId);
    } else if (mode !== 'piece') {
      const nextVariantId = nextType === 'wagon' ? await newVariant(tx) : null;
      await update(tx,[...entries,['wagon_variant_id',nextVariantId]],'id',id);
    }
    if (patch.magneticCouplerA !== undefined || patch.magneticCouplerB !== undefined) {
      const a = patch.magneticCouplerA ?? Boolean(old.magnetic_coupler_a), b = patch.magneticCouplerB ?? Boolean(old.magnetic_coupler_b);
      patch.magneticCouplers = a === b ? a : null;
    }
    await update(tx,values(patch,physical),'id',id);
    return id;
  };
  return transaction ? work(transaction) : withWriteTransaction(work);
}
export async function resizeVariant(id: number, body: Record<string, unknown>) {
  const parsed = z.object({ quantity: z.number().int().min(1).max(1000), expectedQuantity: z.number().int().min(1), removeVehicleIds: z.array(z.number().int().positive()).default([]) }).safeParse(body);
  if (!parsed.success) throw new CollectionError('Neplatný počet kusů.');
  const { quantity, expectedQuantity, removeVehicleIds } = parsed.data;
  return withWriteTransaction(async tx => {
    const pieces = (await tx.execute({sql:'SELECT * FROM vehicles WHERE wagon_variant_id = ? ORDER BY id',args:[id]})).rows;
    if (!pieces.length) throw new CollectionError('Varianta nenalezena.',404);
    if (pieces.length !== expectedQuantity) throw new CollectionError('Počet kusů se mezitím změnil. Obnovte stránku.',409);
    if (quantity < pieces.length) {
      if (removeVehicleIds.length !== pieces.length - quantity || new Set(removeVehicleIds).size !== removeVehicleIds.length || removeVehicleIds.some(id => !pieces.some(p => Number(p.id) === id))) throw new CollectionError('Vyberte přesně ty kusy, které chcete odebrat.');
      const placeholders = removeVehicleIds.map(()=>'?').join(',');
      if ((await tx.execute({sql:`SELECT id FROM train_vehicles WHERE vehicle_id IN (${placeholders}) LIMIT 1`,args:removeVehicleIds})).rows.length) throw new CollectionError('Vybraný kus je v soupravě. Nejprve jej ze souprav odeberte.',409);
      await tx.execute({sql:`DELETE FROM vehicles WHERE id IN (${placeholders})`,args:removeVehicleIds});
    } else {
      if (removeVehicleIds.length) throw new CollectionError('Při přidávání kusů nevybírejte kusy k odebrání.');
      await copyMany(tx,pieces.find(p=>!p.is_template) ?? pieces[0],id,quantity-pieces.length);
    }
    return Number((await tx.execute({sql:'SELECT id FROM vehicles WHERE wagon_variant_id = ? ORDER BY id LIMIT 1',args:[id]})).rows[0].id);
  });
}
async function deletePiece(tx: Transaction, id: number) {
  if ((await tx.execute({sql:'SELECT id FROM train_vehicles WHERE vehicle_id = ? LIMIT 1',args:[id]})).rows.length) throw new CollectionError('Tento kus je v soupravě. Nejprve jej ze souprav odeberte.',409);
  const result = await tx.execute({sql:'DELETE FROM vehicles WHERE id = ?',args:[id]});
  if (!result.rowsAffected) throw new CollectionError('Vozidlo nenalezeno.',404);
}
export async function removeVehicle(id: number) { return withWriteTransaction(tx => deletePiece(tx,id)); }

/** Add one physical wagon; duplication copies configuration into independent records. */
export async function addWagonCopy(sourceId: number, mode: unknown) {
  if (!Number.isSafeInteger(sourceId) || sourceId < 1) throw new CollectionError('Neplatné vozidlo.');
  if (mode !== 'blank' && mode !== 'equipment') throw new CollectionError('Neplatný způsob přidání vozu.');
  return withWriteTransaction(async tx => {
    const source = (await tx.execute({sql:'SELECT * FROM vehicles WHERE id=?',args:[sourceId]})).rows[0];
    if (!source) throw new CollectionError('Vozidlo nenalezeno.',404);
    if (source.type !== 'wagon') throw new CollectionError('Kopírovat lze pouze vozy.');
    let variantId = source.wagon_variant_id as number | null;
    if (variantId == null) {
      variantId = await newVariant(tx);
      await update(tx,[['wagon_variant_id',variantId]],'id',sourceId);
    }
    const count = Number((await tx.execute({sql:'SELECT count(*) AS n FROM vehicles WHERE wagon_variant_id=?',args:[variantId]})).rows[0].n);
    if (count >= 1000) throw new CollectionError('Ve variantě může být nejvýše 1000 vozů.');
    const equipment = ['magnetic_couplers','magnetic_coupler_a','magnetic_coupler_b','has_tail_lights','has_lights','has_sound_decoder','has_speaker','is_weathered'];
    const id = await insert(tx,[...Object.values(shared).map(key => [key,source[key]] as [string,InValue]),
      ['wagon_variant_id',variantId],['is_template',0],
      ...equipment.map(key => [key,mode === 'equipment' ? source[key] : 0] as [string,InValue])]);
    if (mode === 'equipment') {
      await update(tx,[['dcc_address',source.dcc_address as InValue]],'id',id);
      const decoderIds = new Map<string,string>();
      const decoders = (await tx.execute({sql:'SELECT * FROM vehicle_decoders WHERE vehicle_id=?',args:[sourceId]})).rows;
      for (const decoder of decoders) {
        const newId = crypto.randomUUID(); decoderIds.set(String(decoder.id),newId);
        const row = {...decoder,id:newId,vehicle_id:id};
        const keys = Object.keys(row);
        await tx.execute({sql:`INSERT INTO vehicle_decoders (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,args:Object.values(row) as InValue[]});
      }
      const functions = (await tx.execute({sql:'SELECT * FROM decoder_functions WHERE vehicle_id=?',args:[sourceId]})).rows;
      for (const fn of functions) {
        const row: Record<string,InValue> = Object.fromEntries(Object.entries(fn).filter(([key])=>key!=='id'));
        row.vehicle_id=id;
        if (fn.decoder_id != null && !decoderIds.has(String(fn.decoder_id))) throw new CollectionError('Funkce odkazuje na jiný dekodér.');
        row.decoder_id=fn.decoder_id == null ? null : decoderIds.get(String(fn.decoder_id))!;
        const keys = Object.keys(row);
        await tx.execute({sql:`INSERT INTO decoder_functions (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,args:Object.values(row) as InValue[]});
      }
    }
    return id;
  });
}
