const millimetres = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 6 });

export function formatVehicleLength(value: number) { return `${millimetres.format(value)} mm`; }

export function VehicleLength({ value }: { value: number | null }) {
  return <dl className="mt-4 text-sm">
    <dt className="text-secondary">Délka přes nárazníky</dt>
    <dd className="font-medium tabular-nums">{value == null ? "Nevyplněna" : formatVehicleLength(value)}</dd>
  </dl>;
}
