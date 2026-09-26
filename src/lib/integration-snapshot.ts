import { createHash } from "node:crypto";
import { readAtomic } from "@/db";
import { imageManifest, publicOrigin } from "./integration-images";
import { syncContract } from "./sync-contract";

const number = (value: unknown) => value === null || value === undefined ? null : Number(value);
const string = (value: unknown) => value === null || value === undefined ? null : String(value);
export async function collectionSnapshot(includeTemplates = false) {
  const [vehicles, decoders, functions, trains, composition, speedProfiles] = await readAtomic([
    "SELECT * FROM vehicles ORDER BY id",
    "SELECT * FROM vehicle_decoders ORDER BY vehicle_id, sort_order, id",
    "SELECT * FROM decoder_functions ORDER BY vehicle_id, decoder_id, function_number, id",
    "SELECT * FROM trains ORDER BY id",
    "SELECT * FROM train_vehicles ORDER BY train_id, position, id",
    "SELECT * FROM vehicle_speed_profiles ORDER BY vehicle_id",
  ]);
  const visible = vehicles.filter(v => includeTemplates || !v.is_template);
  const visibleIds = new Set(visible.map(v => Number(v.id)));
  const exportedVehicles = await Promise.all(visible.map(async v => ({
    sourceId: `vlacky:vehicle:${v.id}`, id: Number(v.id), recordType: v.is_template ? "template" : "owned",
    type: String(v.type), wagonKind: v.type === "wagon" ? string(v.wagon_kind) ?? "passenger" : null, designation: String(v.designation), operator: string(v.operator), classType: string(v.class_type),
    modelManufacturer: string(v.manufacturer), catalogNumber: string(v.catalog_number), notes: string(v.notes),
    dccAddress: number(v.dcc_address),
    referenceOnly: { speedProfile: speedProfiles.find(p => p.vehicle_id === v.id) ? JSON.parse(String(speedProfiles.find(p => p.vehicle_id === v.id)!.profile)) : null },
    image: await imageManifest(Number(v.id), string(v.image_path)),
    decoders: decoders.filter(d => d.vehicle_id === v.id).map(d => ({
      sourceId: `vlacky:decoder:${d.id}`, id: String(d.id), name: String(d.name), manufacturer: String(d.manufacturer), model: String(d.model),
      address: number(d.address) ?? number(v.dcc_address), addressSource: d.address === null ? "vehicle" : "decoder",
      notes: String(d.notes),
      functions: functions.filter(f => f.decoder_id === d.id).map(f => ({
        number: Number(f.function_number), key: `F${f.function_number}`, label: String(f.label),
        category: String(f.category), behavior: String(f.behavior), description: string(f.description),
      })),
      referenceOnly: { soundProject: String(d.sound_project), manualUrl: String(d.manual_url), cvs: JSON.parse(String(d.cvs)) as unknown },
    })),
  })));
  const excludedTrains: { sourceId: string; reason: string }[] = [];
  const exportedTrains = trains.flatMap(t => {
    const rows = composition.filter(c => c.train_id === t.id);
    if (rows.some(c => !visibleIds.has(Number(c.vehicle_id)))) {
      excludedTrains.push({ sourceId: `vlacky:train:${t.id}`, reason: "Contains an excluded template or missing vehicle; omitted to prevent incomplete composition." });
      return [];
    }
    return [{ sourceId: `vlacky:train:${t.id}`, id: Number(t.id), kind: string(t.kind) ?? "passenger", number: string(t.number), name: string(t.name), category: string(t.category), notes: string(t.notes),
      referenceOnly: { route: string(t.route), era: string(t.era) },
      composition: rows.map(c => ({ sourceId: `vlacky:assignment:${c.id}`, position: Number(c.position), vehicleSourceId: `vlacky:vehicle:${c.vehicle_id}`, notes: string(c.notes), orientation: null })),
    }];
  });
  const data = { schemaVersion: "1.2", source: publicOrigin(), includeTemplates, syncContract, vehicles: exportedVehicles, trains: exportedTrains, excluded: { templateVehicleCount: vehicles.length - visible.length, trains: excludedTrains } };
  return { ...data, revision: createHash("sha256").update(JSON.stringify(data)).digest("hex"), generatedAt: new Date().toISOString() };
}
