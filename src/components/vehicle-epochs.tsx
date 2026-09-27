import { epochLabel, epochLabels } from '@/lib/epochs';

export function VehicleEpochs({ epochs, notes }: { epochs: number[]; notes?: string | null }) {
  return <div className="mt-4 text-sm">
    <dl><dt className="text-secondary">Epocha</dt><dd className="font-medium">{epochLabel(epochs)}</dd></dl>
    {notes && <details className="mt-1 text-xs text-secondary"><summary className="cursor-pointer">Zdroj a upřesnění</summary><p className="mt-2 whitespace-pre-wrap break-words">{notes}</p></details>}
  </div>;
}

export function EpochBadges({ epochs }: { epochs: number[] }) {
  return <span className="inline-flex gap-1.5">{epochs.map(epoch => <span key={epoch} title={`Epocha ${epochLabels[epoch]}`} aria-label={`Epocha ${epochLabels[epoch]}`} className="inline-flex size-8 items-center justify-center rounded-md border border-divider bg-subtle text-sm font-semibold text-secondary">{epochLabels[epoch]}</span>)}</span>;
}
