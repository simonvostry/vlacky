import { createHash, timingSafeEqual } from "node:crypto";

export function hasIntegrationToken(request: Request): boolean {
  const configured = process.env.VLACKY_MCP_TOKEN;
  if (!configured || configured.length < 32) return false;
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ") || header.length > 1024) return false;
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(header.slice(7)), digest(configured));
}
export function authorizeIntegration(request: Request): Response | null {
  if (hasIntegrationToken(request)) return null;
  return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="vlacky-read-only"', "Cache-Control": "private, no-store" } });
}
export const integrationHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
