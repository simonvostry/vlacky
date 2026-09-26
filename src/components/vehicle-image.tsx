import Image, { type ImageProps } from "next/image";
import enhancedImages from "@/lib/enhanced-vehicle-images.json";

// Reviewed UI derivatives for images used by the current train sets.
// Clear this mapping to restore originals; DB paths and integration downloads stay original.
const previews: Record<string, string> = enhancedImages;

export default function VehicleImage({ src, style, alt, ...props }: ImageProps) {
  return <Image {...props} alt={alt} src={typeof src === "string" ? previews[src] ?? src : src}
    style={{ ...style, maxWidth: "none" }} />;
}
