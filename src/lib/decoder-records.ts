import type { vehicleDecoders, decoderFunctions } from '@/db/schema';
import type { DecoderConfig } from './decoder-config';

/** Shared mapping for ordinary reads and authoritative write-transaction snapshots. */
export function assembleDecoderRecords(decoders: (typeof vehicleDecoders.$inferSelect)[], functions: (typeof decoderFunctions.$inferSelect)[]): (DecoderConfig & {vehicleId:number})[] {
  return decoders.map(d => ({
    ...d,
    functions: functions.filter(f => f.decoderId === d.id).map(f => ({
      functionNumber: f.functionNumber, label: f.label, description: f.description || "",
      category: f.category === "sound" || f.category === "light" ? f.category : "other",
      behavior: f.behavior === "momentary" ? "momentary" : "toggle",
    })),
  }));
}
