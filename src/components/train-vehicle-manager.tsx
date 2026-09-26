"use client";
import { hasVehicleSound, type VehicleEquipment } from "@/lib/vehicle-equipment";
import { groupVehicles } from "@/lib/wagon-variants";

import { EquipmentIcons } from "@/components/equipment-icons";
import VehicleImage from "@/components/vehicle-image";
import { vehicleSection } from "@/lib/vehicle-kind";
import { useRouter } from "next/navigation";
import { ArrowUpIcon, ArrowDownIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { useState } from "react";
import Link from "next/link";

type Vehicle = VehicleEquipment & {
  id: number;
  designation: string;
  operator: string | null;
  type: string;
  wagonKind: string;
  wagonVariantId: number | null;
  hasLights: boolean | null;
  runningNumber: string | null;
  dccAddress: number | null;
  imagePath: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  manufacturer: string | null;
  catalogNumber: string | null;
};

type TrainVehicleRow = {
  id: number;
  position: number;
  vehicleId: number;
  designation: string;
  operator: string | null;
  vehicleType: string;
  wagonKind: string;
  classType: string | null;
  dccAddresses: string;
  notes: string | null;
};

type Props = {
  trainId: number;
  kind: string;
  trainVehicles: TrainVehicleRow[];
  allVehicles: Vehicle[];
};

export function TrainVehicleManager({
  trainId,
  kind,
  trainVehicles,
  allVehicles,
}: Props) {
  const router = useRouter();
  const [addVehicleId, setAddVehicleId] = useState("");
  const [showAll, setShowAll] = useState(false);
  const available = allVehicles.filter(v => showAll || v.type === "loco" || v.wagonKind === kind);
  const [busy, setBusy] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [choosePieces, setChoosePieces] = useState(false);
  const [chosenIds, setChosenIds] = useState<number[]>([]);
  const [error, setError] = useState('');
  const groups = groupVehicles(available);
  const selected = groups.find(g=>g.key===addVehicleId);
  const usedIds = new Set(trainVehicles.map(v=>v.vehicleId));
  const freePieces = selected?.pieces.filter(p=>!usedIds.has(p.id)) ?? [];
  async function change(method: string, body: object) {
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/vlaky/${trainId}/vozidla`,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if (!res.ok) {setError((await res.json()).error || 'Změna se nezdařila.');return false;}
      router.refresh(); return true;
    } catch {setError('Spojení se nezdařilo. Zkuste to znovu.');return false;}
    finally {setBusy(false);}
  }

  async function addVehicle() {
    if (!addVehicleId) return;
    if (!selected) return;
    const target = selected.vehicle.wagonVariantId && selected.vehicle.type === 'wagon'
      ? {variantId:selected.vehicle.wagonVariantId,quantity, ...(choosePieces ? {vehicleIds:chosenIds} : {})}
      : {vehicleId:selected.vehicle.id};
    if (await change('POST',target)) {setAddVehicleId('');setQuantity(1);setChosenIds([]);}
  }

  async function moveVehicle(trainVehicleId: number, direction: "up" | "down") {
    await change('PUT',{action:'move',trainVehicleId,direction});
  }
  async function removeVehicle(trainVehicleId: number) {
    if (confirm('Odebrat vozidlo ze soupravy?')) await change('DELETE',{trainVehicleId});
  }

  function classLabel(classType: string | null) {
    if (!classType) return null;
    if (classType === "1") return "1. tř.";
    if (classType === "2") return "2. tř.";
    if (classType === "restaurant") return "Rest.";
    return classType;
  }

  return (
    <div className="rounded-lg border border-divider">
      <h2 className="border-b border-divider px-4 py-3 font-semibold">
        Seznam vozidel
      </h2>

      {trainVehicles.length > 0 && (
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-divider text-left text-xs uppercase text-secondary">
              <th className="px-4 py-2 w-10">#</th>
              <th className="px-4 py-2">Vozidlo</th>
              <th className="px-4 py-2">Třída</th>
              <th className="px-4 py-2">DCC</th>
              <th className="px-4 py-2">Poznámky</th>
              <th className="px-4 py-2 w-24">Řazení</th>
            </tr>
          </thead>
          <tbody>
            {trainVehicles.map((tv, i) => (
              <tr
                key={tv.id}
                className="border-b border-divider hover:bg-subtle"
              >
                <td className="px-4 py-2 text-secondary">{tv.position}</td>
                <td className="px-4 py-2 font-medium">
                  <Link
                    href={`/${vehicleSection({ type: tv.vehicleType, wagonKind: tv.wagonKind })}/${tv.vehicleId}`}
                    className="hover:text-accent"
                  >
                    {tv.operator && (
                      <span className="text-secondary">{tv.operator} </span>
                    )}
                    {tv.designation}
                  </Link>
                  <div className="mt-1"><EquipmentIcons value={allVehicles.find(v=>v.id===tv.vehicleId) ?? {}} wagon={tv.vehicleType === "wagon"} activeOnly /></div>
                  {hasVehicleSound(allVehicles.find(v=>v.id===tv.vehicleId) ?? {}) && (i===0 || trainVehicles[i-1].vehicleType!=='loco') && <p className="mt-1 text-xs font-normal text-accent">Zvuk: doporučeno zařadit hned za lokomotivu.</p>}
                  <span className="ml-1 text-[10px] uppercase text-secondary">
                    {tv.vehicleType === "loco" ? "lok" : `kus #${tv.vehicleId}`}
                  </span>
                </td>
                <td className="px-4 py-2 text-secondary">
                  {tv.vehicleType === "loco" ? (
                    <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium uppercase text-white">
                      Lok
                    </span>
                  ) : (
                    classLabel(tv.classType) || "—"
                  )}
                </td>
                <td className="px-4 py-2 font-mono text-secondary">
                  {tv.dccAddresses || "—"}
                </td>
                <td className="px-4 py-2 text-xs text-secondary">{tv.notes}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveVehicle(tv.id, "up")}
                      disabled={i === 0 || busy}
                      className="ui-icon-button"
                      title="Nahoru" aria-label="Posunout vůz nahoru"
                    >
                      <ArrowUpIcon className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => moveVehicle(tv.id, "down")}
                      disabled={i === trainVehicles.length - 1 || busy}
                      className="ui-icon-button"
                      title="Dolů" aria-label="Posunout vůz dolů"
                    >
                      <ArrowDownIcon className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => removeVehicle(tv.id)}
                      disabled={busy}
                      className="ui-icon-button text-danger"
                      title="Odebrat" aria-label="Odebrat vůz ze soupravy"
                    >
                      <XMarkIcon className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      <label className="flex items-center gap-2 border-t border-divider px-4 py-3 text-sm text-secondary">
        <input type="checkbox" checked={showAll} onChange={e => { setShowAll(e.target.checked); setAddVehicleId(""); }} />
        Nabídnout i vozy pro {kind === "freight" ? "osobní" : "nákladní"} soupravy
      </label>
      <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
        <select
          value={addVehicleId}
          onChange={(e) => {setAddVehicleId(e.target.value);setQuantity(1);setChosenIds([]);setChoosePieces(false);}}
          aria-label="Vozidlo k přidání do soupravy"
          className="min-w-0 flex-1 rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
        >
          <option value="">Vyberte vozidlo...</option>
          {groups.map(({key,vehicle:v,pieces}) => (
            <option key={key} value={key} disabled={pieces.every(p=>usedIds.has(p.id))}>
              {v.operator ? `${v.operator} ` : ""}{v.designation} ({v.type === "loco" ? "lok" : v.wagonKind === "freight" ? "nákladní vůz" : "osobní vůz"}) · {pieces.filter(p=>!usedIds.has(p.id)).length}/{pieces.length} volných{v.type === 'wagon' ? ` · ${[v.manufacturer,v.catalogNumber].filter(Boolean).join(' ')} · #${v.wagonVariantId ?? v.id}` : ''}{pieces.some(p=>hasVehicleSound(p)) ? ' · zvuk' : ''}
            </option>
          ))}
        </select>
        {selected?.vehicle.type === 'wagon' && <label className="flex items-center gap-2 text-sm">Počet
          <input type="number" min={1} max={freePieces.length} step={1} value={quantity} onChange={e=>setQuantity(Number(e.target.value))} className="w-20 rounded-md border border-control px-2 py-2" />
        </label>}
        <button
          onClick={addVehicle}
          disabled={!addVehicleId || busy || !Number.isInteger(quantity) || quantity < 1 || quantity > freePieces.length || (choosePieces && chosenIds.length !== quantity)}
          className="ui-button ui-button-primary"
        >
          Přidat
        </button>
      </div>
      {selected?.vehicle.imagePath && <div className="overflow-x-auto px-4 pb-3"><VehicleImage unoptimized src={selected.vehicle.imagePath} alt={selected.vehicle.designation} width={selected.vehicle.imageWidth ?? 264} height={selected.vehicle.imageHeight ?? 41} style={{width:(selected.vehicle.imageWidth ?? 264)*.75,height:(selected.vehicle.imageHeight ?? 41)*.75}} /></div>}
      {selected?.vehicle.type === 'wagon' && <div className="px-4 pb-3 text-sm">
        {freePieces.some(p=>hasVehicleSound(p)) && <p className="mb-2 text-xs text-accent">Zvuk: {freePieces.filter(p=>hasVehicleSound(p)).map(p=>`kus #${p.id}`).join(', ')}. Pro jeho zařazení vyberte konkrétní kus.</p>}
        <label className="flex items-center gap-2"><input type="checkbox" checked={choosePieces} onChange={e=>{setChoosePieces(e.target.checked);setChosenIds([]);}} />Vybrat konkrétní kusy</label>
        {choosePieces && <ul className="mt-2 space-y-2">{freePieces.map(p=><li key={p.id}><label className="flex items-start gap-2">
          <input type="checkbox" className="mt-1" checked={chosenIds.includes(p.id)} onChange={e=>setChosenIds(ids=>e.target.checked ? [...ids,p.id] : ids.filter(id=>id!==p.id))} />
          <span>Kus #{p.id}{p.runningNumber ? ` · ${p.runningNumber}` : ''}<span className="block text-xs text-secondary"><EquipmentIcons value={p} focusable={false} />{p.dccAddress != null && <span className="ml-2">DCC {p.dccAddress}</span>}</span></span>
        </label></li>)}</ul>}
      </div>}
      {error && <p role="alert" className="px-4 pb-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
