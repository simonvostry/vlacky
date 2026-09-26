import Image from "next/image";

import { modelManufacturer } from "@/lib/model-manufacturers";

/** Model makers only: catalog prototype builders and decoder makers are separate. */
export function ManufacturerLogo({ manufacturer, compact = false }: {
  manufacturer: string | null;
  compact?: boolean;
}) {
  if (!manufacturer) return null;
  const logo = modelManufacturer(manufacturer);
  if (!logo) return <span>{manufacturer}</span>;

  const scale = Math.min((compact ? 64 : 112) / logo.width, (compact ? 16 : 24) / logo.height);
  const width = logo.width * scale;
  const height = logo.height * scale;
  return (
    <span title={manufacturer} className={`inline-flex shrink-0 items-center rounded-sm ${logo.darkBacking ? "manufacturer-logo-dark" : "manufacturer-logo"}`}>
      <Image unoptimized src={logo.src} alt={manufacturer}
        width={Math.round(width)} height={Math.round(height)}
        style={{ width, height }} />
    </span>
  );
}
