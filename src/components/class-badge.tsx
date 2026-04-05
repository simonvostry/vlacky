type Props = {
  classType: string | null;
  size?: "xs" | "sm" | "md";
};

const config: Record<string, { label: string; shortLabel: string; className: string }> = {
  "1": { label: "1. třída", shortLabel: "1", className: "bg-amber-400 text-amber-900" },
  "2": { label: "2. třída", shortLabel: "2", className: "bg-blue-500 text-white" },
  restaurant: {
    label: "Restaurační",
    shortLabel: "R",
    className: "bg-red-600 text-white",
  },
};

export function ClassBadge({ classType, size = "sm", short = false }: Props & { short?: boolean }) {
  if (!classType) return null;
  const c = config[classType];
  if (!c) return null;

  if (size === "xs") {
    return (
      <span
        className={`inline-flex items-center justify-center rounded font-bold ${c.className}`}
        style={{ width: 16, height: 16, fontSize: 11, lineHeight: 1 }}
      >
        {short ? c.shortLabel : c.label}
      </span>
    );
  }

  const sizeClass =
    size === "sm"
      ? "px-1.5 py-0.5 text-[10px]"
      : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-block rounded font-bold uppercase ${c.className} ${sizeClass}`}
    >
      {short ? c.shortLabel : c.label}
    </span>
  );
}
