import { authorizeApiRequest } from '@/lib/auth-guards';
import { withWriteTransaction } from '@/db';
import { CollectionError } from '@/lib/wagon-storage';
import { NextResponse } from 'next/server';
import { z } from 'zod';

type Context = { params: Promise<{id:string}> };
async function change(request: Request, context: Context, method: string) {
  const denied = await authorizeApiRequest();
  if (denied) return denied;
  const trainId = Number((await context.params).id);
  const body = await request.json();
  if (body.dccAddressOverride != null || body.lightingDecoderAddress != null) return NextResponse.json({error:'DCC konfigurace patří vozidlu.'},{status:400});
  try {
    const result = await withWriteTransaction(async tx => {
      if (!(await tx.execute({sql:'SELECT id FROM trains WHERE id = ?',args:[trainId]})).rows.length) throw new CollectionError('Souprava nenalezena.',404);
      if (method === 'POST') {
        const parsed = z.object({vehicleId:z.number().int().positive().optional(),variantId:z.number().int().positive().optional(),quantity:z.number().int().min(1).max(1000).default(1),vehicleIds:z.array(z.number().int().positive()).optional(),notes:z.string().nullable().optional()}).safeParse(body);
        if (!parsed.success) throw new CollectionError('Neplatný výběr vozidel.');
        const input = parsed.data;
        if ((!input.vehicleId && !input.variantId) || (input.vehicleId && input.variantId)) throw new CollectionError('Vyberte vozidlo nebo variantu.');
        const available = (await tx.execute({sql:`SELECT id FROM vehicles WHERE ${input.variantId ? 'wagon_variant_id' : 'id'} = ? AND id NOT IN (SELECT vehicle_id FROM train_vehicles WHERE train_id = ?) ORDER BY id`,args:[input.variantId ?? input.vehicleId!,trainId]})).rows.map(r=>Number(r.id));
        const ids = input.vehicleIds ?? available.slice(0,input.quantity);
        if (ids.length !== input.quantity || new Set(ids).size !== ids.length || ids.some(id=>!available.includes(id))) throw new CollectionError('Není dost volných kusů. Stejný kus může být v této soupravě jen jednou.',409);
        let position = Number((await tx.execute({sql:'SELECT coalesce(max(position),0) AS position FROM train_vehicles WHERE train_id = ?',args:[trainId]})).rows[0].position);
        const additions = ids.map(id=>({trainId,vehicleId:id,position:++position,notes:input.notes ?? null}));
        const rows = await tx.batch(additions.map(row=>({sql:'INSERT INTO train_vehicles (train_id,vehicle_id,position,notes) VALUES (?,?,?,?) RETURNING id',args:[row.trainId,row.vehicleId,row.position,row.notes]})));
        const added = additions.map((row,index)=>({id:Number(rows[index].rows[0].id),...row}));
        return input.variantId ? {added} : added[0];
      }
      if (!Number.isInteger(body.trainVehicleId)) throw new CollectionError('Neplatný kus.');
      const row = (await tx.execute({sql:'SELECT * FROM train_vehicles WHERE id = ? AND train_id = ?',args:[body.trainVehicleId,trainId]})).rows[0];
      if (!row) throw new CollectionError('Vozidlo v soupravě nenalezeno.',404);
      if (method === 'DELETE') {
        await tx.execute({sql:'DELETE FROM train_vehicles WHERE id = ?',args:[body.trainVehicleId]});
        await tx.execute({sql:'UPDATE train_vehicles SET position = position - 1 WHERE train_id = ? AND position > ?',args:[trainId,row.position]});
      } else if (body.action === 'move') {
        if (!['up','down'].includes(body.direction)) throw new CollectionError('Neplatný směr.');
        const position = Number(row.position) + (body.direction === 'up' ? -1 : 1);
        const other = (await tx.execute({sql:'SELECT id FROM train_vehicles WHERE train_id = ? AND position = ?',args:[trainId,position]})).rows[0];
        if (!other) throw new CollectionError('Vozidlo již je na kraji soupravy.');
        await tx.execute({sql:'UPDATE train_vehicles SET position = CASE id WHEN ? THEN ? ELSE ? END WHERE id IN (?,?)',args:[row.id,position,row.position,row.id,other.id]});
      } else if (body.action === 'update') {
        if (body.notes != null && typeof body.notes !== 'string') throw new CollectionError('Neplatná poznámka.');
        await tx.execute({sql:'UPDATE train_vehicles SET notes = ? WHERE id = ?',args:[body.notes ?? null,row.id]});
      } else throw new CollectionError('Neznámá akce.');
      return {ok:true};
    });
    return NextResponse.json(result,{status:method === 'POST' ? 201 : 200});
  } catch (error) {
    if (error instanceof CollectionError) return NextResponse.json({error:error.message},{status:error.status});
    throw error;
  }
}
export async function POST(request: Request, context: Context) { return change(request,context,'POST'); }
export async function PUT(request: Request, context: Context) { return change(request,context,'PUT'); }
export async function DELETE(request: Request, context: Context) { return change(request,context,'DELETE'); }
