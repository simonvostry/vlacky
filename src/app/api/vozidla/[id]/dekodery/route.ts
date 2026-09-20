import { authorizeApiRequest } from "@/lib/auth-guards";
import { db, schema, executeAtomic } from "@/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { parseDccConfig } from "@/lib/decoder-config";
import { decoderSaveStatements, getDecoders } from "@/lib/decoder-storage";

type Context = { params: Promise<{ id: string }> };
async function vehicleFor(context: Context) {
  const { id } = await context.params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return undefined;
  return db.select().from(schema.vehicles).where(eq(schema.vehicles.id, Number(id))).get();
}
export async function GET(_request: Request, context: Context) {
  const denied = await authorizeApiRequest();
  if (denied) return denied;
  const vehicle = await vehicleFor(context);
  if (!vehicle) return NextResponse.json({ error: "Vozidlo nenalezeno." }, { status: 404 });
  return NextResponse.json({ dccAddress: vehicle.dccAddress, decoders: await getDecoders(vehicle.id) });
}
export async function PUT(request: Request, context: Context) {
  const denied = await authorizeApiRequest();
  if (denied) return denied;
  const vehicle = await vehicleFor(context);
  if (!vehicle) return NextResponse.json({ error: "Vozidlo nenalezeno." }, { status: 404 });
  const text = await request.text();
  if (text.length > 1_000_000) return NextResponse.json({ error: "Konfigurace je příliš velká." }, { status: 413 });
  let config;
  try { config = parseDccConfig(JSON.parse(text)); }
  catch (error) { return NextResponse.json({ error: error instanceof SyntaxError ? "Neplatný JSON." : error instanceof Error ? error.message : "Neplatná konfigurace." }, { status: 400 }); }
  try { await executeAtomic(decoderSaveStatements(vehicle.id, config)); }
  catch { return NextResponse.json({ error: "Konfiguraci se nepodařilo uložit. Obnovte stránku a zkuste to znovu." }, { status: 409 }); }
  return NextResponse.json(config);
}
