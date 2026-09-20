import { db, schema } from "@/db";
import { getDecoders } from "@/lib/decoder-storage";
import { DecoderEditor } from "./decoder-editor";

export async function VehicleDecoders({ vehicleId, dccAddress }: { vehicleId: number; dccAddress: number | null }) {
  const [decoders, vehicles] = await Promise.all([
    getDecoders(),
    db.select({ id: schema.vehicles.id, designation: schema.vehicles.designation, operator: schema.vehicles.operator }).from(schema.vehicles).all(),
  ]);
  return <DecoderEditor vehicleId={vehicleId} initial={{ dccAddress, decoders: decoders.filter(d => d.vehicleId === vehicleId) }}
    templates={decoders.map(d => ({ decoder: d, label: `${vehicles.find(v => v.id === d.vehicleId)?.designation || "Vozidlo"} · ${d.name}${d.model ? ` (${d.model})` : ""}` }))} />;
}
