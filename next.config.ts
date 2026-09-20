import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/mcp": ["./public/img/**/*"],
    "/api/integrations/v1/**": ["./public/img/**/*"],
  },
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
