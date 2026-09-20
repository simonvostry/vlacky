import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { authorizeIntegration, integrationHeaders } from "@/lib/integration-auth";
import { readVehicleImage } from "@/lib/integration-images";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = authorizeIntegration(request);
  if (denied) return denied;
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return Response.json({ error: "Not found" }, { status: 404, headers: integrationHeaders });
  const format = new URL(request.url).searchParams.get("format") || "original";
  if (format !== "original" && format !== "png") return Response.json({ error: "Unsupported format" }, { status: 400, headers: integrationHeaders });
  const vehicle = await db.select().from(schema.vehicles).where(eq(schema.vehicles.id, Number(id))).get();
  if (!vehicle?.imagePath) return Response.json({ error: "Image not found" }, { status: 404, headers: integrationHeaders });
  try {
    const asset = await readVehicleImage(vehicle.imagePath, format);
    return new Response(new Uint8Array(asset.bytes), { headers: {
      ...integrationHeaders, "Content-Type": asset.mimeType,
      "Content-Disposition": `attachment; filename="vlacky-vehicle-${id}${asset.extension}"`,
      "Content-Length": String(asset.bytes.length), "X-Content-SHA256": asset.sha256,
    } });
  } catch { return Response.json({ error: "Image unavailable" }, { status: 404, headers: integrationHeaders }); }
}
