import { authorizeIntegration, integrationHeaders } from "@/lib/integration-auth";
import { collectionSnapshot } from "@/lib/integration-snapshot";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const denied = authorizeIntegration(request);
  if (denied) return denied;
  const include = new URL(request.url).searchParams.get("includeTemplates");
  if (include !== null && include !== "true" && include !== "false") return Response.json({ error: "includeTemplates must be true or false" }, { status: 400, headers: integrationHeaders });
  return Response.json(await collectionSnapshot(include === "true"), { headers: integrationHeaders });
}
