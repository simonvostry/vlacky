'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { DocumentDuplicateIcon, TrashIcon } from '@heroicons/react/20/solid';
import { EditAction } from '@/components/ui-actions';
import { EquipmentGlyph, EquipmentIcons } from '@/components/equipment-icons';
import { InlineDelete } from '@/components/inline-delete';
import { DecoderFields } from '@/components/decoder-editor';
import { functionLabel, type DecoderConfig } from '@/lib/decoder-config';
import { hasVehicleSound, soundEquipmentPatch, type VehicleEquipment } from '@/lib/vehicle-equipment';

export type WagonPiece = VehicleEquipment & {
  id: number; runningNumber: string | null; hasLights: boolean | null;
  dccAddress: number | null; isTemplate: boolean; notes: string | null; referenceNotes?: string | null;
};
export type WagonAppearance = { vehicleId: number; trainId: number; trainNumber: string | null; trainName: string | null; trainCategory: string | null; position: number };
const input = 'w-full min-w-0 rounded-md border border-control bg-surface px-3 py-2 text-sm';
const fields = ['runningNumber', 'dccAddress', 'magneticCouplerA', 'magneticCouplerB', 'hasTailLights', 'hasLights', 'hasSoundDecoder', 'hasSpeaker', 'isWeathered', 'isTemplate', 'notes'] as const;

export function WagonPieceRow({ piece, selected, section, disabled, onEditingChange, onSelect, onSaved, ordinal, onDuplicate, onDelete, decoders, templates, appearances }: {
  appearances: WagonAppearance[];
  decoders: DecoderConfig[]; templates: {label:string;decoder:DecoderConfig}[];
  ordinal?: number; onDuplicate: () => void; onDelete: () => Promise<void>;
  piece: WagonPiece; selected: boolean; section: string; disabled: boolean;
  onEditingChange: (editing: boolean) => void; onSelect: () => void; onSaved: (piece: WagonPiece, decoders: DecoderConfig[]) => void;
}) {
  const label = ordinal ? `Vůz ${ordinal}` : 'Vůz';
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
    <div className="relative flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md px-4 py-3 pr-24 hover:bg-subtle">
      <Link aria-current={selected ? 'page' : undefined} aria-controls={`piece-details-${piece.id}`} aria-expanded={selected}
        href={`/${section}/${piece.id}`} scroll={false} onClick={e => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault(); if (!disabled) onSelect();
        }} aria-label={`Vybrat ${label.toLowerCase()}`} className="min-w-0 after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-focus">
        <span className="relative z-10 flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1">
          {ordinal && <span className="w-4 text-xs tabular-nums text-secondary">{ordinal}</span>}
          <EquipmentIcons value={piece} focusable={false} />
          {piece.runningNumber && <span className="text-xs text-secondary">{piece.runningNumber}</span>}
          <PieceDccSummary address={piece.dccAddress} decoders={decoders} />
          {piece.isTemplate && <span className="text-xs text-warning">Předloha</span>}
          {saved && <span role="status" className="text-xs text-success">Uloženo.</span>}
        </span>
      </Link>
      {appearances.length > 0 && <ul aria-label="Zařazení ve vlacích" className="relative z-10 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {appearances.map(appearance => <li key={appearance.trainId} className="min-w-0">
          <Link href={`/soupravy/${appearance.trainId}`} className="inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 rounded-sm py-1 text-accent hover:underline focus-visible:outline-2 focus-visible:outline-focus">
            <span className="min-w-0 break-words">{[appearance.trainCategory, appearance.trainNumber, appearance.trainName].filter(Boolean).join(' ') || 'Souprava'}</span>
            <span className="text-secondary">· pozice {appearance.position}</span>
          </Link>
        </li>)}
      </ul>}
      <div ref={trigger} className="edit-reveal absolute right-3 top-2.5 z-10 flex gap-1">{!editing && <>
        <EditAction label={`Upravit ${label.toLowerCase()}`} disabled={disabled} onClick={() => { onSelect(); setEditing(true); setSaved(false); onEditingChange(true); }} />
        <button type="button" className="ui-icon-button ui-edit" aria-label={`Duplikovat ${label.toLowerCase()}`} title="Duplikovat výbavu, DCC adresu a konfiguraci dekodéru" disabled={disabled} onClick={onDuplicate}><DocumentDuplicateIcon className="size-4" aria-hidden="true" /><span className="ui-tooltip" aria-hidden="true">Duplikovat</span></button>
      </>}</div>
    </div>
    {editing && <div className="px-4 pb-4"><PieceEditor decoders={decoders} templates={templates} piece={piece} onClose={close} onSaved={onSaved} label={label} onDelete={onDelete} disabled={disabled} /></div>}
  </div>;
}

function PieceDccSummary({ address, decoders }: { address: number | null; decoders: DecoderConfig[] }) {
  const groups = new Map<number | null, string[]>();
  if (address !== null) groups.set(address, []);
  for (const decoder of decoders) {
    const effectiveAddress = decoder.address ?? address;
    const functions = groups.get(effectiveAddress) ?? [];
    for (const fn of decoder.functions) {
      const label = `F${fn.functionNumber} ${functionLabel(fn)}`;
      if (!functions.includes(label)) functions.push(label);
    }
    groups.set(effectiveAddress, functions);
  }
  const text = [...groups].map(([dcc, functions]) => [
    dcc !== null ? `DCC ${dcc}` : '', functions.join(', '),
  ].filter(Boolean).join(' — ')).filter(Boolean).join('; ');
  return text ? <span className="min-w-0 break-words text-xs font-normal tabular-nums text-secondary">{text}</span> : null;
}

function PieceEditor({ piece, onClose, onSaved, label, onDelete, disabled, decoders, templates }: { decoders:DecoderConfig[]; templates:{label:string;decoder:DecoderConfig}[]; piece: WagonPiece; onClose: (saved: boolean) => void; onSaved: (piece: WagonPiece, decoders: DecoderConfig[]) => void; label:string; onDelete:()=>Promise<void>; disabled:boolean }) {
  const notesId = useId();
  // Capture only this piece's editable values; later refreshes must not reset a draft.
  const [base] = useState(piece);
  const [draft, setDraft] = useState(piece);
  const [baseDecoders]=useState(()=>JSON.stringify(decoders));
  const [decoderDraft,setDecoderDraft]=useState(decoders);
  const [catalogBusy,setCatalogBusy]=useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = busy || disabled || catalogBusy;
  const couplerCount = Number(draft.magneticCouplerA) + Number(draft.magneticCouplerB);
  function patch(value: Partial<WagonPiece>) { setDraft(d => ({ ...d, ...value })); }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    const changes = Object.fromEntries(fields.filter(key => draft[key] !== base[key]).map(key => [key, draft[key]]));
    const decoderChanges=JSON.stringify(decoderDraft)!==baseDecoders;
    if (!Object.keys(changes).length && !decoderChanges) { onClose(false); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/vozidla/${piece.id}/konfigurace`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({piece:changes,...(decoderChanges?{decoders:decoderDraft}:{})}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Uložení se nezdařilo.');
      onSaved(data.vehicle,data.decoders); onClose(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Spojení se nezdařilo. Zkuste to znovu.'); }
    finally { setBusy(false); }
  }
  return <form aria-label={`Upravit ${label.toLowerCase()}`} onSubmit={save} className="mt-3">
    <fieldset disabled={locked} className="min-w-0 space-y-3 disabled:opacity-60">
      <div className="flex min-w-0 flex-wrap items-end gap-3" data-piece-controls>
        <label className="w-full min-w-0 text-xs font-medium text-secondary sm:w-52">Číslo / označení vozu
          <input autoFocus className={`${input} mt-1`} value={draft.runningNumber ?? ''} onChange={e => patch({ runningNumber: e.target.value || null })} />
        </label>
        <label className="w-28 shrink-0 text-xs font-medium text-secondary">DCC adresa
          <input className={`${input} mt-1`} type="number" min={1} max={10239} step={1} value={draft.dccAddress ?? ''} onChange={e => patch({ dccAddress: e.target.value === '' ? null : Number(e.target.value) })} />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Výbava vozu">
        <button type="button" aria-label={`Magnetická spřáhla: ${couplerCount === 0 ? 'žádné' : couplerCount === 1 ? 'jeden konec' : 'oba konce'}. Změnit počet.`}
          title="Magnetická spřáhla: žádné → jeden konec → oba konce" onClick={() => {
            const next = (couplerCount + 1) % 3;
            // Keep the originally recorded end when returning to one coupler.
            patch({ magneticCouplerA: next === 2 || (next === 1 && !base.magneticCouplerB), magneticCouplerB: next === 2 || (next === 1 && base.magneticCouplerB) });
          }} className={`ui-button !px-2 !text-xs ${couplerCount ? 'border-accent bg-accent-soft text-accent' : 'ui-button-secondary'}`}>
          <EquipmentGlyph name="coupler" className="size-4" />Spřáhla
          <span aria-hidden="true" className={`inline-flex w-4 shrink-0 justify-center tabular-nums ${couplerCount ? 'text-success' : 'text-secondary'}`}>{couplerCount || '−'}</span>
        </button>
        {([
          ['tail', 'Koncová světla', 'Koncová světla', draft.hasTailLights, () => patch({ hasTailLights: !draft.hasTailLights })],
          ['lights', 'Osvětlení', 'Osvětlení', Boolean(draft.hasLights), () => patch({ hasLights: !draft.hasLights })],
          ['sound', 'Zvuk', 'Zvuk', hasVehicleSound(draft), () => patch(soundEquipmentPatch(!hasVehicleSound(draft), draft))],
          ['weather', 'Patinováno', 'Patinováno', draft.isWeathered, () => patch({ isWeathered: !draft.isWeathered })],
        ] as const).map(([icon, text, label, active, toggle]) => <button key={label} type="button" aria-label={label} title={label} aria-pressed={active} onClick={toggle} className={`ui-button !px-2 !text-xs ${active ? 'border-accent bg-accent-soft text-accent' : 'ui-button-secondary'}`}>
          <EquipmentGlyph name={icon} className="size-4" />{text}<span aria-hidden="true" className={`inline-flex w-4 shrink-0 justify-center ${active ? 'text-success' : 'text-secondary'}`}>{active ? '✓' : '−'}</span>
        </button>)}
        </div>
      </div>
      <details className="text-xs text-secondary"><summary className="cursor-pointer">Poznámky a další údaje</summary><div className="mt-3 space-y-3">
      <div>
        <label htmlFor={notesId} className="block text-xs font-medium text-secondary">Poznámky k vozu</label>
        <textarea id={notesId} rows={2} className={`${input} mt-1`} value={draft.notes ?? ''} onChange={e => patch({ notes: e.target.value || null })} />
      </div>
      {piece.referenceNotes && <details className="text-xs text-secondary"><summary className="cursor-pointer">Zdroje a původní poznámky</summary><p className="mt-2 whitespace-pre-wrap break-words">{piece.referenceNotes}</p></details>}
      <label className="flex items-center gap-2 text-xs text-secondary"><input type="checkbox" checked={draft.isTemplate} onChange={e => patch({ isTemplate: e.target.checked })} />Ukázka / předloha (vynechat ze synchronizace)</label>
      </div></details>
      <div className="border-t border-divider pt-3">
        <h3 className="mb-3 text-sm font-semibold">Dekodér a funkce</h3>
        <DecoderFields config={{dccAddress:draft.dccAddress,decoders:decoderDraft}} onChange={config=>setDecoderDraft(config.decoders)} templates={templates} disabled={locked} onBusyChange={setCatalogBusy} />
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="ui-button ui-button-primary">{locked ? 'Ukládám…' : 'Uložit'}</button>
        <button type="button" className="ui-button ui-button-secondary" onClick={() => onClose(false)}>Zrušit</button>
        <div className="ml-auto"><InlineDelete disabled={locked} question="Odstranit tento vůz včetně jeho DCC nastavení a poznámek?" onConfirm={onDelete}><TrashIcon className="size-4" aria-hidden="true" />Odstranit vůz</InlineDelete></div>
      </div>
    </fieldset>
  </form>;
}
