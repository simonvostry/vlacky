'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { EditAction } from '@/components/ui-actions';
import { EquipmentGlyph, EquipmentIcons } from '@/components/equipment-icons';
import { FilterDropdown } from '@/components/filter-dropdown';
import { hasVehicleSound, soundEquipmentPatch, type VehicleEquipment } from '@/lib/vehicle-equipment';

export type WagonPiece = VehicleEquipment & {
  id: number; runningNumber: string | null; hasLights: boolean | null;
  dccAddress: number | null; isTemplate: boolean; notes: string | null;
};
const input = 'w-full min-w-0 rounded-md border border-control bg-surface px-3 py-2 text-sm';
const fields = ['runningNumber', 'dccAddress', 'magneticCouplerA', 'magneticCouplerB', 'hasTailLights', 'hasLights', 'hasSoundDecoder', 'hasSpeaker', 'isWeathered', 'isTemplate', 'notes'] as const;

export function WagonPieceRow({ piece, selected, section, disabled, onEditingChange, onSelect, onSaved }: {
  piece: WagonPiece; selected: boolean; section: string; disabled: boolean;
  onEditingChange: (editing: boolean) => void; onSelect: () => void; onSaved: (piece: WagonPiece) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const trigger = useRef<HTMLDivElement>(null);
  const wasEditing = useRef(false);
  useLayoutEffect(() => {
    if (!editing && wasEditing.current) trigger.current?.querySelector('button')?.focus();
    wasEditing.current = editing;
  }, [editing]);
  function close(wasSaved: boolean) {
    setEditing(false); setSaved(wasSaved); onEditingChange(false);
  }
  return <div className="edit-reveal-scope min-w-0 flex-1">
    <div className="relative">
      <Link aria-current={selected ? 'page' : undefined} aria-controls={`piece-details-${piece.id}`} aria-expanded={selected}
        href={`/${section}/${piece.id}`} scroll={false} onClick={e => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault(); if (!disabled) onSelect();
        }} className="block rounded-md px-4 py-3 pr-16 hover:bg-subtle focus-visible:outline-2 focus-visible:outline-focus">
        <span className="text-sm font-semibold">Kus #{piece.id}{piece.runningNumber ? ` · ${piece.runningNumber}` : ''}</span>
        {piece.isTemplate && <span className="ml-2 text-xs text-warning">Předloha</span>}
        {!editing && <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <EquipmentIcons value={piece} focusable={false} />
          {piece.dccAddress != null && <span className="text-xs tabular-nums text-secondary">DCC {piece.dccAddress}</span>}
          {saved && <span role="status" className="text-xs text-success">Uloženo.</span>}
        </span>}
      </Link>
      <div ref={trigger} className="edit-reveal absolute right-4 top-3">{!editing && <EditAction label={`Upravit kus #${piece.id}`} disabled={disabled} onClick={() => { setEditing(true); setSaved(false); onEditingChange(true); }} />}</div>
    </div>
    {editing && <div className="px-4 pb-4"><PieceEditor piece={piece} onClose={close} onSaved={onSaved} /></div>}
  </div>;
}

function PieceEditor({ piece, onClose, onSaved }: { piece: WagonPiece; onClose: (saved: boolean) => void; onSaved: (piece: WagonPiece) => void }) {
  const notesId = useId();
  // Capture only this piece's editable values; later refreshes must not reset a draft.
  const [base] = useState(piece);
  const [draft, setDraft] = useState(piece);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = busy;
  function patch(value: Partial<WagonPiece>) { setDraft(d => ({ ...d, ...value })); }
  const couplers = draft.magneticCouplerA && draft.magneticCouplerB ? 'both' : draft.magneticCouplerA || draft.magneticCouplerB ? 'one' : '';
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    const changes = Object.fromEntries(fields.filter(key => draft[key] !== base[key]).map(key => [key, draft[key]]));
    if (!Object.keys(changes).length) { onClose(false); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/vozidla/${piece.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...changes, editMode: 'piece' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Uložení se nezdařilo.');
      onSaved(data); onClose(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Spojení se nezdařilo. Zkuste to znovu.'); }
    finally { setBusy(false); }
  }
  return <form aria-label={`Upravit kus #${piece.id}`} onSubmit={save} className="mt-3">
    <fieldset disabled={locked} className="min-w-0 space-y-3 disabled:opacity-60">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="min-w-0 text-xs font-medium text-secondary">Číslo / označení kusu
          <input autoFocus className={`${input} mt-1`} value={draft.runningNumber ?? ''} onChange={e => patch({ runningNumber: e.target.value || null })} />
        </label>
        <label className="min-w-0 text-xs font-medium text-secondary">DCC adresa
          <input className={`${input} mt-1`} type="number" min={1} max={10239} step={1} value={draft.dccAddress ?? ''} onChange={e => patch({ dccAddress: e.target.value === '' ? null : Number(e.target.value) })} />
        </label>
        <div className="min-w-0">
          <span className="mb-1 block text-xs font-medium text-secondary">Magnetická spřáhla</span>
          <FilterDropdown label="Magnetická spřáhla" emptyLabel="Bez magnetických spřáhel" value={couplers} disabled={locked} className="w-full" options={[{ value: 'one', label: 'Na jednom konci' }, { value: 'both', label: 'Na obou koncích' }]} onChange={mode => patch({ magneticCouplerA: mode === 'both' || (mode === 'one' && !draft.magneticCouplerB), magneticCouplerB: mode === 'both' || (mode === 'one' && draft.magneticCouplerB) })} />
        </div>
        {couplers === 'one' && <div className="min-w-0">
          <span className="mb-1 block text-xs font-medium text-secondary">Magnetický konec</span>
          <FilterDropdown label="Magnetický konec" emptyLabel="Konec A" value={draft.magneticCouplerB ? 'B' : ''} disabled={locked} className="w-full" options={[{ value: 'B', label: 'Konec B' }]} onChange={end => patch({ magneticCouplerA: end !== 'B', magneticCouplerB: end === 'B' })} />
        </div>}
      </div>
      <div className="flex flex-wrap gap-2">
        {([
          ['tail', 'Koncová světla', draft.hasTailLights, () => patch({ hasTailLights: !draft.hasTailLights })],
          ['lights', 'Osvětlení', Boolean(draft.hasLights), () => patch({ hasLights: !draft.hasLights })],
          ['sound', 'Zvuk', hasVehicleSound(draft), () => patch(soundEquipmentPatch(!hasVehicleSound(draft), draft))],
          ['weather', 'Patinováno', draft.isWeathered, () => patch({ isWeathered: !draft.isWeathered })],
        ] as const).map(([icon, label, active, toggle]) => <button key={icon} type="button" aria-pressed={active} onClick={toggle} className={`ui-button ${active ? 'border-accent bg-accent-soft text-accent' : 'ui-button-secondary'}`}>
          <EquipmentGlyph name={icon} className="size-4" />{label}<span aria-hidden="true">{active ? '✓' : '−'}</span>
        </button>)}
      </div>
      <div>
        <label htmlFor={notesId} className="block text-xs font-medium text-secondary">Poznámky ke kusu</label>
        <textarea id={notesId} rows={2} className={`${input} mt-1`} value={draft.notes ?? ''} onChange={e => patch({ notes: e.target.value || null })} />
      </div>
      <label className="flex items-center gap-2 text-xs text-secondary"><input type="checkbox" checked={draft.isTemplate} onChange={e => patch({ isTemplate: e.target.checked })} />Ukázka / předloha (vynechat ze synchronizace)</label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" className="ui-button ui-button-primary">{locked ? 'Ukládám…' : 'Uložit'}</button>
        <button type="button" className="ui-button ui-button-secondary" onClick={() => onClose(false)}>Zrušit</button>
      </div>
    </fieldset>
  </form>;
}
