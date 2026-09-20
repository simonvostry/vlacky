// Authenticated maintenance import. Deliberately cannot replace an existing profile:
// subsequent updates use the session-protected API and its optimistic concurrency token.
import { readFileSync } from "node:fs";
import { parseSpeedProfile } from "../src/lib/speed-profile";
import { db, schema } from "../src/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
async function main() {
  const [id, path] = process.argv.slice(2);
  if (!/^[1-9]\d*$/.test(id ?? "") || !path) throw new Error("Usage: npx tsx scripts/import-speed-profile.ts VEHICLE_ID PROFILE_JSON");
  const profile = parseSpeedProfile(JSON.parse(readFileSync(path, "utf8")));
  const vehicle = await db.select().from(schema.vehicles).where(eq(schema.vehicles.id, Number(id))).get();
  if (!vehicle || vehicle.type !== "loco" || profile.source?.vehicleSourceId !== `vlacky:vehicle:${vehicle.id}`) throw new Error("Verified locomotive source identity required.");
  const existing = await db.select().from(schema.vehicleSpeedProfiles).where(eq(schema.vehicleSpeedProfiles.vehicleId, vehicle.id)).get();
  if (existing) {
    if (JSON.stringify(existing.profile) === JSON.stringify(profile)) { console.log("Identical profile already stored; no change."); return; }
    throw new Error("Profile already exists. Use the authenticated editor/API with its current token to replace it.");
  }
  const result = await db.insert(schema.vehicleSpeedProfiles).values({ vehicleId: vehicle.id, profile, updatedAt: `${new Date().toISOString()}/${randomUUID()}` }).onConflictDoNothing().returning().get();
  if (!result) throw new Error("Concurrent import detected; nothing overwritten.");
  console.log(`Imported current profile for vehicle ${vehicle.id}: ${profile.points.length} steps, measured ${profile.measuredOn}.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
