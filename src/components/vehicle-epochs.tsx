import { epochLabel } from '@/lib/epochs';

export function VehicleEpochs({ epochs, notes }: { epochs: number[]; notes?: string | null }) {
  return <div className="mt-4 text-sm">
    <dl><dt className="text-secondary">Epocha</dt><dd className="font-medium">{epochLabel(epochs)}</dd></dl>
    {notes && <details className="mt-1 text-xs text-secondary"><summary className="cursor-pointer">Zdroj a upřesnění</summary><p className="mt-2 whitespace-pre-wrap break-words">{notes}</p></details>}
  </div>;
}
