import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import type { DecoderConfig, VehicleDccConfig } from "./decoder-config";
import type { InStatement } from "@libsql/client";

export async function getDecoders(vehicleId?: number): Promise<(DecoderConfig & { vehicleId: number })[]> {
  const [decoders, functions] = await Promise.all([
    db.select().from(schema.vehicleDecoders).where(vehicleId === undefined ? undefined : eq(schema.vehicleDecoders.vehicleId, vehicleId)).orderBy(schema.vehicleDecoders.sortOrder).all(),
    db.select().from(schema.decoderFunctions).where(vehicleId === undefined ? undefined : eq(schema.decoderFunctions.vehicleId, vehicleId)).orderBy(schema.decoderFunctions.functionNumber).all(),
  ]);
  return decoders.map(d => ({
    ...d,
    functions: functions.filter(f => f.decoderId === d.id).map(f => ({
      functionNumber: f.functionNumber, label: f.label, description: f.description || "",
      category: f.category === "sound" || f.category === "light" ? f.category : "other",
      behavior: f.behavior === "momentary" ? "momentary" : "toggle",
    })),
  }));
}

// One atomic save: a failed insert rolls back the address and all function changes.
export function decoderSaveStatements(vehicleId: number, config: VehicleDccConfig): InStatement[] {
  const statements: InStatement[] = [
    { sql: "UPDATE vehicles SET dcc_address = ? WHERE id = ?", args: [config.dccAddress, vehicleId] },
    { sql: "DELETE FROM decoder_functions WHERE vehicle_id = ?", args: [vehicleId] },
    { sql: "DELETE FROM vehicle_decoders WHERE vehicle_id = ?", args: [vehicleId] },
  ];
  for (const [position, d] of config.decoders.entries()) {
    statements.push({
      sql: "INSERT INTO vehicle_decoders (id, vehicle_id, name, manufacturer, model, address, sound_project, manual_url, notes, cvs, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [d.id, vehicleId, d.name, d.manufacturer, d.model, d.address, d.soundProject, d.manualUrl, d.notes, JSON.stringify(d.cvs), position],
    });
    for (const f of d.functions) statements.push({
      sql: "INSERT INTO decoder_functions (vehicle_id, decoder_id, function_number, label, description, category, behavior) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [vehicleId, d.id, f.functionNumber, f.label, f.description, f.category, f.behavior],
    });
  }
  return statements;
}
