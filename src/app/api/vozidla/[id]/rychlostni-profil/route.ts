import { randomUUID } from "node:crypto";
import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import { authorizeApiRequest } from "@/lib/auth-guards";
import { parseSpeedProfile } from "@/lib/speed-profile";
import { getSpeedProfile } from "@/lib/speed-profile-storage";
import { z } from "zod";

type Context = { params: Promise<{ id: string }> };
async function vehicleFor(context: Context) {
  const { id } = await context.params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return null;
  return db.select().from(schema.vehicles).where(and(eq(schema.vehicles.id, Number(id)), eq(schema.vehicles.type, "loco"))).get();
}
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
export async function GET(_request: Request, context: Context) {
  const denied = await authorizeApiRequest(); if (denied) return denied;
  const vehicle = await vehicleFor(context);
  if (!vehicle) return json({ error: "Lokomotiva nenalezena." }, 404);
  return json(await getSpeedProfile(vehicle.id));
}
export async function PUT(request: Request, context: Context) {
  const denied = await authorizeApiRequest(); if (denied) return denied;
  const vehicle = await vehicleFor(context);
  if (!vehicle) return json({ error: "Lokomotiva nenalezena." }, 404);
  const text = await request.text();
  if (text.length > 250000) return json({ error: "Profil je příliš velký." }, 413);
  let profile, expectedUpdatedAt;
  try {
    const body = z.object({ profile: z.unknown(), expectedUpdatedAt: z.string().max(100).nullable() }).strict().parse(JSON.parse(text));
    profile = parseSpeedProfile(body.profile); expectedUpdatedAt = body.expectedUpdatedAt;
    if (profile.source?.vehicleSourceId && profile.source.vehicleSourceId !== `vlacky:vehicle:${vehicle.id}`) throw new Error("Profil patří jinému vozidlu.");
  } catch (error) {
    return json({ error: error instanceof z.ZodError ? error.issues.map(v => v.message).join(" ") : error instanceof SyntaxError ? "Neplatný JSON." : error instanceof Error ? error.message : "Neplatný profil." }, 400);
  }
  // One atomic conditional write prevents a stale editor/import from overwriting newer measurements.
  const updatedAt = `${new Date().toISOString()}/${randomUUID()}`;
  const values = { vehicleId: vehicle.id, profile, updatedAt };
  const saved = expectedUpdatedAt === null
    ? await db.insert(schema.vehicleSpeedProfiles).values(values).onConflictDoNothing().returning().get()
    : await db.update(schema.vehicleSpeedProfiles).set({ profile, updatedAt }).where(and(eq(schema.vehicleSpeedProfiles.vehicleId, vehicle.id), eq(schema.vehicleSpeedProfiles.updatedAt, expectedUpdatedAt))).returning().get();
  if (!saved) return json({ error: "Profil se mezitím změnil. Obnovte stránku před dalším uložením." }, 409);
  return json({ profile: saved.profile, updatedAt: saved.updatedAt });
}
