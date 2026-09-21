import Image from "next/image";

const operatorLogos: Record<string, { src: string; width: number; height: number }> = {
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
};

export function OperatorLogo({ operator, height = 14, inverted = false }: Props) {
  if (!operator) return null;

  const logo = operatorLogos[operator];
  if (logo) {
    return (
      <Image
        unoptimized
        src={logo.src}
        alt={operator}
        width={Math.round(height * logo.width / logo.height)}
        height={height}
        className={`shrink-0 operator-logo ${inverted ? "operator-logo-inverted" : ""}`}
        style={{ height, width: "auto", filter: inverted ? "brightness(10)" : "none" }}
      />
    );
  }

  return <span className="text-[11px] text-secondary">{operator}</span>;
}

export { operatorLogos };
