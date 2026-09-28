'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/20/solid';
import type { DecoderConfig } from '@/lib/decoder-config';
import { WagonPieceRow, type WagonPiece, type WagonAppearance } from '@/components/wagon-piece-row';

export function WagonPieces({pieces: initialPieces,selectedId: initialSelectedId,section,decoders: initialDecoders,templates,appearances}: {
  pieces:WagonPiece[]; selectedId:number; section:string;
  decoders:(DecoderConfig & {vehicleId:number})[]; templates:{label:string;decoder:DecoderConfig}[]; appearances:WagonAppearance[];
}) {
  const router = useRouter();
  const [pieces,setPieces] = useState(initialPieces);
  const [decoders,setDecoders] = useState(initialDecoders);
  const [previousData,setPreviousData] = useState({pieces:initialPieces,decoders:initialDecoders});
  if (previousData.pieces !== initialPieces || previousData.decoders !== initialDecoders) {
    setPreviousData({pieces:initialPieces,decoders:initialDecoders});
    setPieces(initialPieces); setDecoders(initialDecoders);
  }
  const pathname = usePathname();
  const routeId = Number(pathname.split('/').pop());
  const selectedId = pieces.some(p => p.id === routeId) ? routeId : initialSelectedId;
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [status,setStatus] = useState('');
  const [editingIds, setEditingIds] = useState<number[]>([]);
  async function add(sourceId: number, mode: 'blank' | 'equipment') {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/vozidla/${sourceId}/kopie`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Vůz se nepodařilo přidat.');
      setPieces(values => [...values,data]);
      setDecoders(values => [...values,...data.decoders]);
      window.history.pushState(null,'',`/${section}/${data.id}`);
    } catch(error) { setError(error instanceof Error ? error.message : 'Spojení se nezdařilo.'); }
    finally { setBusy(false); }
  }
  async function applySettings(id: number) {
    if (busy || editingIds.length) return;
    setBusy(true); setError(''); setStatus('');
    try {
      const response = await fetch(`/api/vozidla/${id}/pouzit-nastaveni`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({targetIds:pieces.filter(p=>p.id!==id).map(p=>p.id)})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Nastavení se nepodařilo přenést.');
      const updated = new Map<number,WagonPiece>(data.pieces.map((p:WagonPiece)=>[p.id,p]));
      setPieces(values=>values.map(p=>updated.get(p.id)??p));
      setDecoders(values=>[...values.filter(d=>!updated.has(d.vehicleId)),...data.decoders]);
      setStatus(`Nastavení přeneseno na ostatní vozy (${updated.size}).`);
    } catch(error) { setError(error instanceof Error ? error.message : 'Spojení se nezdařilo.'); }
    finally { setBusy(false); }
  }
  async function remove(id: number) {
    if (editingIds.some(value => value !== id)) {
      setError('Nejprve uložte nebo zrušte ostatní rozpracované úpravy.'); return;
    }
    setBusy(true); setError('');
    try {
      const response=await fetch(`/api/vozidla/${id}`,{method:'DELETE'});
      const data=await response.json();
      if (!response.ok) throw new Error(data.error || 'Vůz se nepodařilo odstranit.');
      const remaining=pieces.filter(p=>p.id!==id);
      setPieces(remaining); setEditingIds([]);
      const next=remaining.find(p=>p.id===selectedId) ?? remaining[0];
      router.replace(next ? `/${section}/${next.id}` : `/${section}`);
      router.refresh();
    } catch(error) { setError(error instanceof Error ? error.message : 'Spojení se nezdařilo.'); }
    finally { setBusy(false); }
  }
  return <section className="mt-6 rounded-lg border border-divider">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-4 py-3">
      <h2 className="font-semibold">Moje vozy</h2>
      <button type="button" className="ui-icon-button" aria-label="Přidat další vůz" title="Přidat další vůz bez individuální výbavy" disabled={busy} onClick={()=>void add(selectedId,'blank')}><PlusIcon className="size-5" aria-hidden="true" /></button>
    </div>
    {error && <p role="alert" className="px-4 pt-3 text-sm text-danger">{error}</p>}
    {status && <p role="status" className="px-4 pt-3 text-sm text-success">{status}</p>}
    <ul className="divide-y divide-divider">
      {pieces.map((p,index)=><li key={p.id} data-piece-id={p.id} className={`edit-reveal-scope ${p.id===selectedId ? 'bg-selected' : ''}`}>
        <div className="flex items-start">
          <WagonPieceRow piece={p} selected={p.id===selectedId} section={section} disabled={busy} ordinal={pieces.length > 1 ? index+1 : undefined}
            onDuplicate={()=>void add(p.id,'equipment')} onDelete={()=>remove(p.id)}
            otherCount={pieces.length-1} applyDisabled={editingIds.length>0} onApplySettings={()=>applySettings(p.id)}
            decoders={decoders.filter(d=>d.vehicleId===p.id)} templates={templates} appearances={appearances.filter(a=>a.vehicleId===p.id)}
            onSaved={(saved,configuration) => {
              setPieces(values => values.map(value => value.id === saved.id ? saved : value));
              setDecoders(values=>[...values.filter(d=>d.vehicleId!==p.id),...configuration.map(d=>({...d,vehicleId:p.id}))]);
            }}
            onSelect={() => { if (selectedId !== p.id) window.history.pushState(null, '', `/${section}/${p.id}`); }}
            onEditingChange={editing => setEditingIds(ids => editing ? [...ids, p.id] : ids.filter(id => id !== p.id))} />
        </div>
        <div id={`piece-details-${p.id}`} hidden={p.id!==selectedId || editingIds.includes(p.id) || !p.notes} className="border-t border-divider px-4 py-3">
          {p.notes && <p className="whitespace-pre-wrap break-words text-sm text-secondary">{p.notes}</p>}

        </div>
      </li>)}
    </ul>
  </section>;
}
