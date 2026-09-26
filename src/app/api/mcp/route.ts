import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { authorizeIntegration, integrationHeaders } from "@/lib/integration-auth";
import { collectionSnapshot } from "@/lib/integration-snapshot";
import { publicOrigin } from "@/lib/integration-images";
import { mcpInstructions, syncContract } from "@/lib/sync-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const result = (value: Record<string, unknown>) => ({ content: [{ type: "text" as const, text: JSON.stringify(value) }], structuredContent: value });
const includeTemplates = z.boolean().default(false).describe("Include explicitly marked samples only when requested; never sync them by default.");
const id = z.number().int().positive().describe("Numeric Vlacky ID from list_vehicles or list_trains. Not a DCC address.");
const handler = createMcpHandler(server => {
  server.registerTool("get_sync_contract", {
    title: "Read iTrain preservation rules", description: "Required before iTrain synchronization. Defines allowed collection fields and calibration/profile data that must remain unchanged.", inputSchema: z.object({}), annotations,
  }, async () => result({ syncContract }));
  server.registerTool("list_vehicles", {
    title: "List collection vehicles", description: "Find locomotives and wagons by stable ID, designation, operator or DCC address. Excludes templates by default.",
    inputSchema: z.object({ type: z.enum(["loco", "wagon"]).optional(), wagonKind: z.enum(["passenger", "freight"]).optional(), query: z.string().max(200).optional(), includeTemplates }), annotations,
  }, async args => {
    const snapshot = await collectionSnapshot(args.includeTemplates);
    const query = args.query?.toLowerCase();
    return result({ revision: snapshot.revision, syncContractVersion: syncContract.version, vehicles: snapshot.vehicles.filter(v => (!args.type || v.type === args.type) && (!args.wagonKind || v.wagonKind === args.wagonKind) && (!query || `${v.designation} ${v.operator} ${v.dccAddress ?? ""}`.toLowerCase().includes(query))).map(v => ({ id: v.id, sourceId: v.sourceId, recordType: v.recordType, designation: v.designation, operator: v.operator, type: v.type, wagonKind: v.wagonKind, dccAddress: v.dccAddress, decoderCount: v.decoders.length, hasImage: v.image?.status === "available" })) });
  });
  server.registerTool("get_vehicle", {
    title: "Get vehicle definition", description: "Vehicle details, decoder addresses and function mappings, image downloads and reference-only CV records. Preserve iTrain measured profiles and calibration.", inputSchema: z.object({ id, includeTemplates }), annotations,
  }, async args => {
    const snapshot = await collectionSnapshot(args.includeTemplates);
    const vehicle = snapshot.vehicles.find(v => v.id === args.id);
    if (!vehicle) return { ...result({ error: "Vehicle not found or excluded template." }), isError: true };
    return result({ revision: snapshot.revision, syncContract, vehicle });
  });
  server.registerTool("list_trains", {
    title: "List train compositions", description: "List saved collection compositions. These do not represent live train positions or active layout assignments.", inputSchema: z.object({ includeTemplates }), annotations,
  }, async args => {
    const snapshot = await collectionSnapshot(args.includeTemplates);
    return result({ revision: snapshot.revision, trains: snapshot.trains.map(t => ({ id: t.id, sourceId: t.sourceId, number: t.number, name: t.name, category: t.category, kind: t.kind, vehicleCount: t.composition.length })), excluded: snapshot.excluded });
  });
  server.registerTool("get_train", {
    title: "Get ordered train composition", description: "Train definition with vehicles in order, each vehicle's decoder functions and images. Does not activate a train or change layout state.", inputSchema: z.object({ id, includeTemplates }), annotations,
  }, async args => {
    const snapshot = await collectionSnapshot(args.includeTemplates);
    const train = snapshot.trains.find(t => t.id === args.id);
    if (!train) return { ...result({ error: "Train not found or contains excluded vehicles." }), isError: true };
    const ids = new Set(train.composition.map(c => c.vehicleSourceId));
    return result({ revision: snapshot.revision, syncContract, train, vehicles: snapshot.vehicles.filter(v => ids.has(v.sourceId)) });
  });
  server.registerTool("get_vehicle_image", {
    title: "Get vehicle image download", description: "Returns authenticated original/PNG image URLs, native dimensions and SHA-256 hashes. Download using the MCP bearer token and store the image locally for iTrain. No resizing.", inputSchema: z.object({ id, includeTemplates }), annotations,
  }, async args => {
    const snapshot = await collectionSnapshot(args.includeTemplates);
    const vehicle = snapshot.vehicles.find(v => v.id === args.id);
    if (!vehicle) return { ...result({ error: "Vehicle not found or excluded template." }), isError: true };
    return result({ sourceId: vehicle.sourceId, image: vehicle.image, preserveExistingIfMissing: true });
  });
  server.registerTool("get_collection_snapshot", {
    title: "Export complete collection", description: "Returns revision, counts and authenticated download URL for the complete JSON snapshot, including all vehicle definitions and image manifests. Download it to disk for bulk synchronization instead of consuming a large tool response.", inputSchema: z.object({ includeTemplates }), annotations,
  }, async args => {
    const snapshot = await collectionSnapshot(args.includeTemplates);
    return result({ schemaVersion: snapshot.schemaVersion, source: snapshot.source, revision: snapshot.revision, generatedAt: snapshot.generatedAt,
      vehicleCount: snapshot.vehicles.length, trainCount: snapshot.trains.length, excluded: snapshot.excluded, syncContract,
      download: { url: `${publicOrigin()}/api/integrations/v1/snapshot${args.includeTemplates ? "?includeTemplates=true" : ""}`, authentication: "Same bearer token as MCP. Download to a local file; check returned revision because the collection may change after this tool call." },
    });
  });
}, { serverInfo: { name: "vlacky", version: "1.0.0" }, instructions: mcpInstructions, maxSubscriptions: 0 });

async function route(request: Request) {
  const denied = authorizeIntegration(request);
  if (denied) return denied;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Cross-origin browser requests are not allowed." }, { status: 403, headers: integrationHeaders });
  const response = await handler(request);
  for (const [key, value] of Object.entries(integrationHeaders)) response.headers.set(key, value);
  return response;
}
export { route as GET, route as POST, route as DELETE };
