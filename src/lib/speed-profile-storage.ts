import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import type { SavedSpeedProfile } from "./speed-profile";
export async function getSpeedProfile(vehicleId: number): Promise<SavedSpeedProfile | null> {
  const row = await db.select().from(schema.vehicleSpeedProfiles).where(eq(schema.vehicleSpeedProfiles.vehicleId, vehicleId)).get();
  return row ? { profile: row.profile, updatedAt: row.updatedAt } : null;
}
