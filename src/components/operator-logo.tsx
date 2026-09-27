import Image from "next/image";

const operatorLogos: Record<string, { src: string; width: number; height: number }> = {
  "SNCF": { src: "/img/logo-sncf.svg", width: 447.96207, height: 234.8 },
  "DLB": { src: "/img/logo-dlb.svg", width: 1154.8369, height: 123.94531 },
  "AAE": { src: "/img/logo-aae.svg", width: 1024, height: 233 },
  "HŽ Cargo": { src: "/img/logo-hz-cargo.svg", width: 218, height: 58 },
  "ČD Cargo": { src: "/img/logo-cd-cargo.svg", width: 164, height: 38 },
  "ZSSK": { src: "/img/logo-zssk.svg", width: 1024, height: 541 },
  "ZSSK Cargo": { src: "/img/logo-zssk-cargo.svg", width: 512, height: 225 },
  "DB Cargo": { src: "/img/logo-db-cargo.svg", width: 253, height: 70 },
  "ČD": { src: "/img/logo-cd.svg", width: 421, height: 274 },
  "ÖBB": { src: "/img/logo-obb.svg", width: 600, height: 220 },
  "ČSD": { src: "/img/logo-csd.svg", width: 411, height: 278.444 },
  "ČSD/ČD": { src: "/img/logo-csd.svg", width: 411, height: 278.444 },
  "DB": { src: "/img/logo-db.svg", width: 100, height: 70 },
  "RJ": { src: "/img/logo-rj.svg", width: 1178, height: 203 },
  "Vogtlandbahn": { src: "/img/logo-vogtlandbahn.svg", width: 2152, height: 197 },
};

type Props = {
  operator: string | null;
  height?: number;
  inverted?: boolean;
  maxWidth?: number;
};

export function OperatorLogo({ operator, height = 14, inverted = false, maxWidth }: Props) {
  if (!operator) return null;

  const logo = operatorLogos[operator];
  if (logo) {
    const displayHeight = maxWidth ? Math.min(height, maxWidth * logo.height / logo.width) : height;
    return (
      <Image
        unoptimized
        src={logo.src}
        alt={operator}
        width={Math.round(displayHeight * logo.width / logo.height)}
        height={Math.round(displayHeight)}
        className={`shrink-0 operator-logo ${inverted ? "operator-logo-inverted" : ""}`}
        style={{ height: displayHeight, width: "auto", ...(maxWidth ? { maxWidth: "100%", objectFit: "contain" as const, objectPosition: "left" } : {}), filter: inverted ? "brightness(10)" : "none" }}
      />
    );
  }

  return <span className="text-[11px] text-secondary">{operator}</span>;
}

export { operatorLogos };
