import Image from "next/image";

const logos: Record<string, { src: string; width: number; height: number; darkBacking?: boolean }> = {
  fleischmann: { src: "/img/manufacturer-fleischmann.svg", width: 6486, height: 964 },
  minitrix: { src: "/img/manufacturer-minitrix.svg", width: 293.87, height: 46.41 },
  "ree models": { src: "/img/manufacturer-ree-modeles.svg", width: 83.3, height: 76.8 },
  sudexpress: { src: "/img/manufacturer-sudexpress.png", width: 220, height: 50, darkBacking: true },
};

/** Model makers only: catalog prototype builders and decoder makers are separate. */
export function ManufacturerLogo({ manufacturer, compact = false }: {
  manufacturer: string | null;
  compact?: boolean;
}) {
  if (!manufacturer) return null;
  const normalized = manufacturer.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
  const key = normalized === "ree modeles" ? "ree models" : normalized === "sud express" ? "sudexpress" : normalized;
  const logo = logos[key];
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
