const operatorLogos: Record<string, string> = {
  "ČD": "/img/logo-cd.svg",
  "ÖBB": "/img/logo-obb.svg",
  "ČSD": "/img/logo-csd.svg",
  "ČSD/ČD": "/img/logo-csd.svg",
  "DB": "/img/logo-db.svg",
  "RJ": "/img/logo-rj.svg",
};

type Props = {
  operator: string | null;
  height?: number;
};

export function OperatorLogo({ operator, height = 14 }: Props) {
  if (!operator) return null;

  const logo = operatorLogos[operator];
  if (logo) {
    return (
      <img
        src={logo}
        alt={operator}
        className="shrink-0"
        style={{ height, width: "auto" }}
      />
    );
  }

  return <span className="text-[11px] text-gray-400">{operator}</span>;
}

export { operatorLogos };
