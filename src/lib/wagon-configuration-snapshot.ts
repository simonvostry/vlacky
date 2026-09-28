import type { Transaction, Row } from '@libsql/client';
import { getTableColumns, type InferSelectModel } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { vehicles, vehicleDecoders, decoderFunctions } from '@/db/schema';
import { assembleDecoderRecords } from './decoder-records';

// Apply the same property names and boolean/JSON conversions as normal Drizzle reads.
function modelRow<T extends SQLiteTable>(table: T, row: Row): InferSelectModel<T> {
  return Object.fromEntries(Object.entries(getTableColumns(table)).map(([key,column]) => {
    const value = row[column.name];
    return [key,value === null ? null : column.mapFromDriverValue(value)];
  })) as InferSelectModel<T>;
}

/** Read the exact saved values before committing, without switching to a read replica. */
export async function wagonConfigurationSnapshot(tx: Transaction, ids: number[]) {
  const placeholders = ids.map(()=>'?').join(',');
  const pieces = (await tx.execute({sql:`SELECT * FROM vehicles WHERE id IN (${placeholders}) ORDER BY id`,args:ids})).rows.map(row=>modelRow(vehicles,row));
  const decoders = (await tx.execute({sql:`SELECT * FROM vehicle_decoders WHERE vehicle_id IN (${placeholders}) ORDER BY sort_order`,args:ids})).rows.map(row=>modelRow(vehicleDecoders,row));
  const functions = (await tx.execute({sql:`SELECT * FROM decoder_functions WHERE vehicle_id IN (${placeholders}) ORDER BY function_number`,args:ids})).rows.map(row=>modelRow(decoderFunctions,row));
  return {pieces,decoders:assembleDecoderRecords(decoders,functions)};
}
