'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DecoderEditor } from '@/components/decoder-editor';
import type { DecoderConfig } from '@/lib/decoder-config';
import { WagonPieceRow, type WagonPiece } from '@/components/wagon-piece-row';

type Appearance = { vehicleId: number; trainId: number; trainNumber: string | null; trainName: string | null; trainCategory: string | null; position: number };
export function WagonPieces({variantId,pieces: initialPieces,selectedId: initialSelectedId,section,decoders: initialDecoders,templates,appearances}: {
  variantId:number|null; pieces:WagonPiece[]; selectedId:number; section:string;
  decoders:(DecoderConfig & {vehicleId:number})[]; templates:{label:string;decoder:DecoderConfig}[]; appearances:Appearance[];
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
  const [quantity,setQuantity] = useState(pieces.length);
  const [removeVehicleIds,setRemove] = useState<number[]>([]);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [editingIds, setEditingIds] = useState<number[]>([]);
  const [decoderEditingIds, setDecoderEditingIds] = useState<number[]>([]);
  const hasDrafts = editingIds.length > 0 || decoderEditingIds.length > 0;
  const reducing = quantity < pieces.length;
  async function save() {
    if (reducing && !confirm(`Odebrat kusy ${removeVehicleIds.map(id=>`#${id}`).join(', ')} včetně jejich nastavení?`)) return;
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/varianty-vozu/${variantId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({quantity,expectedQuantity:pieces.length,removeVehicleIds})});
      const data = await res.json();
      if (!res.ok) {setError(data.error);return;}
      setRemove([]);
      if (removeVehicleIds.includes(selectedId)) router.replace(`/${section}/${data.vehicleId}`);
      router.refresh();
    } catch {setError('Spojení se nezdařilo. Zkuste to znovu.');}
    finally {setBusy(false);}
  }
  return <section className="mt-6 rounded-lg border border-divider">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-4 py-3">
      <h2 className="font-semibold">Moje kusy <span className="ml-2 text-sm font-normal text-secondary">{pieces.filter(p=>!p.isTemplate).length} ks</span></h2>
      {variantId && <form className="flex items-center gap-2" onSubmit={e=>{e.preventDefault();void save();}}>
        <label htmlFor="piece-count" className="text-sm">Počet</label>
        <input id="piece-count" disabled={busy || hasDrafts} type="number" required min={1} max={1000} step={1} value={quantity} onChange={e=>{setQuantity(Number(e.target.value));setRemove([]);}} className="w-20 rounded-md border border-control px-2 py-2 text-sm" />
        <button className="ui-button ui-button-primary" disabled={busy || hasDrafts || quantity === pieces.length || (reducing && removeVehicleIds.length !== pieces.length-quantity)}>Uložit</button>
      </form>}
    </div>
    {reducing && <p className="px-4 pt-3 text-sm text-secondary">Vyberte {pieces.length-quantity} kusů k odebrání. Kusy zařazené v soupravách je nutné nejprve ze souprav odebrat. Smazáním se odstraní i jejich DCC nastavení a poznámky.</p>}
    {error && <p role="alert" className="px-4 pt-3 text-sm text-danger">{error}</p>}
    <ul className="divide-y divide-divider">
      {pieces.map(p=><li key={p.id} data-piece-id={p.id} className={`edit-reveal-scope ${p.id===selectedId ? 'bg-selected' : ''}`}>
        <div className="flex items-start">
          {reducing && <input type="checkbox" aria-label={`Odebrat kus #${p.id}`} className="ml-4 mt-4" checked={removeVehicleIds.includes(p.id)} onChange={e=>setRemove(ids=>e.target.checked ? [...ids,p.id] : ids.filter(id=>id!==p.id))} />}
          <WagonPieceRow piece={p} selected={p.id===selectedId} section={section} disabled={busy || quantity !== pieces.length}
            onSaved={saved => setPieces(values => values.map(value => value.id === saved.id ? saved : value))}
            onSelect={() => { if (selectedId !== p.id) window.history.pushState(null, '', `/${section}/${p.id}`); }}
            onEditingChange={editing => setEditingIds(ids => editing ? [...ids, p.id] : ids.filter(id => id !== p.id))} />
        </div>
        <div id={`piece-details-${p.id}`} hidden={p.id!==selectedId} className="border-t border-divider px-4 py-3">
          {p.notes && <p className="mb-3 whitespace-pre-wrap break-words text-sm text-secondary">{p.notes}</p>}
          {appearances.some(a => a.vehicleId === p.id) && <div className="mb-3">
            <h3 className="mb-1 text-xs font-medium text-secondary">Zařazení ve vlacích</h3>
            <ul className="flex flex-wrap gap-2">{appearances.filter(a => a.vehicleId === p.id).map(a => <li key={a.trainId}>
              <Link href={`/soupravy/${a.trainId}`} className="inline-flex flex-wrap items-center gap-2 rounded-md bg-surface px-3 py-2 text-sm hover:text-accent">
                <span>{[a.trainCategory,a.trainNumber,a.trainName].filter(Boolean).join(' ')}</span><span className="text-xs text-secondary">Pozice {a.position}</span>
              </Link>
            </li>)}</ul>
          </div>}
          <details>
            <summary className="cursor-pointer text-sm font-medium text-secondary">Dekodér a funkce</summary>
            <DecoderEditor vehicleId={p.id} compact initial={{dccAddress:p.dccAddress,decoders:decoders.filter(d => d.vehicleId === p.id)}} templates={templates}
              onSaved={config => {
                setPieces(values => values.map(value => value.id === p.id ? {...value,dccAddress:config.dccAddress} : value));
                setDecoders(values => [...values.filter(d => d.vehicleId !== p.id), ...config.decoders.map(d => ({...d,vehicleId:p.id}))]);
              }}
              onEditingChange={editing => setDecoderEditingIds(ids => editing ? [...ids,p.id] : ids.filter(id => id!==p.id))} />
          </details>
        </div>
      </li>)}
    </ul>
  </section>;
}
