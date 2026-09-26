'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EditAction } from '@/components/ui-actions';
import { equipmentLabel } from '@/lib/wagon-variants';

type Piece = {id:number; runningNumber:string|null; magneticCouplers:boolean|null; hasLights:boolean|null; dccAddress:number|null; isTemplate:boolean; notes:string|null};
export function WagonPieces({variantId,pieces,selectedId,section}: {variantId:number|null;pieces:Piece[];selectedId:number;section:string}) {
  const router = useRouter();
  const [quantity,setQuantity] = useState(pieces.length);
  const [removeVehicleIds,setRemove] = useState<number[]>([]);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
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
        <input id="piece-count" type="number" required min={1} max={1000} step={1} value={quantity} onChange={e=>{setQuantity(Number(e.target.value));setRemove([]);}} className="w-20 rounded-md border border-control px-2 py-2 text-sm" />
        <button className="ui-button ui-button-primary" disabled={busy || quantity === pieces.length || (reducing && removeVehicleIds.length !== pieces.length-quantity)}>Uložit</button>
      </form>}
    </div>
    {reducing && <p className="px-4 pt-3 text-sm text-secondary">Vyberte {pieces.length-quantity} kusů k odebrání. Kusy zařazené v soupravách je nutné nejprve ze souprav odebrat. Smazáním se odstraní i jejich DCC nastavení a poznámky.</p>}
    {error && <p role="alert" className="px-4 pt-3 text-sm text-danger">{error}</p>}
    <ul className="divide-y divide-divider">
      {pieces.map(p=><li key={p.id} className={`flex items-start gap-3 px-4 py-3 ${p.id===selectedId ? 'bg-selected' : ''}`}>
        {reducing && <input type="checkbox" aria-label={`Odebrat kus #${p.id}`} className="mt-1" checked={removeVehicleIds.includes(p.id)} onChange={e=>setRemove(ids=>e.target.checked ? [...ids,p.id] : ids.filter(id=>id!==p.id))} />}
        <div className="min-w-0 flex-1">
          <Link aria-current={p.id===selectedId ? 'page' : undefined} href={`/${section}/${p.id}`} className="text-sm font-semibold hover:text-accent">Kus #{p.id}{p.runningNumber ? ` · ${p.runningNumber}` : ''}</Link>
          {p.isTemplate && <span className="ml-2 text-xs text-warning">Předloha</span>}
          <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-secondary">
            <div><dt className="inline">Magnetická spřáhla: </dt><dd className="inline">{equipmentLabel(p.magneticCouplers)}</dd></div>
            <div><dt className="inline">Osvětlení: </dt><dd className="inline">{equipmentLabel(p.hasLights)}</dd></div>
            <div><dt className="inline">DCC: </dt><dd className="inline">{p.dccAddress ?? '—'}</dd></div>
          </dl>
        </div>
        <EditAction href={`/${section}/${p.id}/upravit`} label={`Upravit kus #${p.id}`} />
      </li>)}
    </ul>
    <p className="border-t border-divider px-4 py-3 text-xs text-secondary">Vybraný kus #{selectedId}: DCC nastavení, poznámky a zařazení v soupravách jsou uvedeny níže.</p>
  </section>;
}
