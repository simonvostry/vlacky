import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

export const publicOrigin = () => process.env.VLACKY_PUBLIC_URL || "https://vlacky.vercel.app";
export async function readVehicleImage(imagePath: string, format: "original" | "png" = "original") {
  if (!/^\/img\/[a-zA-Z0-9_./-]+$/.test(imagePath) || imagePath.split("/").some(s => s === "." || s === "..")) throw new Error("Unsupported image path");
  const root = await realpath(path.join(process.cwd(), "public", "img"));
  const file = await realpath(path.join(process.cwd(), "public", imagePath));
  if (!file.startsWith(root + path.sep)) throw new Error("Image outside image directory");
  const extension = path.extname(file).toLowerCase();
  const types: Record<string, string> = { ".gif": "image/gif", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
  if (!types[extension]) throw new Error("Unsupported image format");
  const original = await readFile(file);
  if (original.length > 10_000_000) throw new Error("Image too large");
  const bytes = format === "png" ? await sharp(original, { limitInputPixels: 20_000_000 }).png().toBuffer() : original;
  const metadata = await sharp(bytes, { limitInputPixels: 20_000_000 }).metadata();
  return { bytes, mimeType: format === "png" ? "image/png" : types[extension], extension: format === "png" ? ".png" : extension, width: metadata.width, height: metadata.height, sha256: createHash("sha256").update(bytes).digest("hex") };
}
export async function imageManifest(vehicleId: number, imagePath: string | null) {
  if (!imagePath) return null;
  try {
    const original = await readVehicleImage(imagePath);
    const png = await readVehicleImage(imagePath, "png");
    const describe = (asset: typeof original, format: string) => ({
      url: `${publicOrigin()}/api/integrations/v1/images/${vehicleId}?format=${format}`,
      filename: `vlacky-vehicle-${vehicleId}${asset.extension}`,
      mimeType: asset.mimeType, width: asset.width, height: asset.height,
      byteLength: asset.bytes.length, sha256: asset.sha256,
    });
    return { status: "available" as const, authentication: "Bearer token required; use the same token as MCP. Do not append it to the URL.", original: describe(original, "original"), png: describe(png, "png"), scaling: "Native pixel dimensions; PNG uses the first frame if the original is animated." };
  } catch {
    return { status: "unavailable" as const, reason: "Stored image is missing or is not an allowed raster image. Preserve the existing iTrain image." };
  }
}
