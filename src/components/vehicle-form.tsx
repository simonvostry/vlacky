"use client";

import { wagonEquipmentFields } from "@/lib/vehicle-equipment";
import { manufacturerKey, manufacturerName, manufacturerOptions } from "@/lib/model-manufacturers";
import { vehicleSection } from "@/lib/vehicle-kind";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Vehicle = {
  id?: number;
  wagonVariantId?: number | null;
  magneticCouplerA?: boolean;
  magneticCouplerB?: boolean;
  hasTailLights?: boolean;
  hasSoundDecoder?: boolean;
  hasSpeaker?: boolean;
  isWeathered?: boolean;
  hasLights?: boolean | null;
  runningNumber?: string;
  isTemplate?: boolean;
  designation: string;
  operator: string;
  type: string;
  wagonKind?: string;
  classType: string;
  imagePath: string;
  imageWidth: number | null;
  imageHeight: number | null;
  manufacturer: string;
  catalogNumber: string;
  dccAddress: number | null;
  notes: string;
  catalogId?: number | null;
  catalogImageId?: number | null;
};

const defaults: Vehicle = {
  magneticCouplerA: false, magneticCouplerB: false, hasTailLights: false,
  hasSoundDecoder: false, hasSpeaker: false, isWeathered: false, hasLights: false,
  designation: "",
  isTemplate: false,
  operator: "",
  type: "wagon",
  wagonKind: "passenger",
  classType: "",
  imagePath: "",
  imageWidth: 264,
  imageHeight: 41,
  manufacturer: "",
  catalogNumber: "",
  dccAddress: null,
  notes: "",
};

export function VehicleForm({ vehicle, manufacturers = [] }: { vehicle?: Vehicle; manufacturers?: string[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Vehicle>({ ...defaults, ...vehicle, hasLights: vehicle?.hasLights ?? false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editScope, setEditScope] = useState("piece");
  const [quantity, setQuantity] = useState(1);
  const [customManufacturer, setCustomManufacturer] = useState(false);
  const manufacturerChoices = manufacturerOptions([...manufacturers, vehicle?.manufacturer ?? null]);
  const selectedManufacturer = manufacturerChoices.find(name => manufacturerKey(name) === manufacturerKey(form.manufacturer)) ?? manufacturerName(form.manufacturer);
  const couplerMode = form.magneticCouplerA && form.magneticCouplerB ? 'both' : form.magneticCouplerA || form.magneticCouplerB ? 'one' : 'none';

  const isEdit = !!vehicle?.id;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {

      const url = isEdit ? `/api/vozidla/${vehicle!.id}` : "/api/vozidla";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          manufacturer: customManufacturer ? form.manufacturer.trim() : form.manufacturer,
          editScope,
          quantity: form.type === "wagon" ? quantity : 1,
          dccAddress: form.dccAddress || null,
          imageWidth: form.imageWidth || null,
          imageHeight: form.imageHeight || null,
          catalogId: form.catalogId || null,
          catalogImageId: form.catalogImageId || null,
        }),
      });

      if (res.ok) {
        const saved = await res.json();
        const section = vehicleSection(saved);
        router.push(`/${section}/${saved.id}`);
        router.refresh();
      } else {
        setError((await res.json()).error || "Uložení se nezdařilo.");
      }
    } catch { setError("Spojení se nezdařilo. Zkuste to znovu."); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!isEdit || !confirm("Opravdu smazat toto vozidlo?")) return;
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/vozidla/${vehicle!.id}`, { method: "DELETE" });
      if (!res.ok) { setError((await res.json()).error || "Smazání se nezdařilo."); return; }
      router.push(`/${vehicleSection(form)}`);
      router.refresh();
    } catch { setError("Spojení se nezdařilo. Zkuste to znovu."); }
    finally { setSaving(false); }
  }

  function set<K extends keyof Vehicle>(key: K, value: Vehicle[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {form.type === 'wagon' && isEdit && <div className="rounded-lg bg-subtle p-4 text-sm">
        <label htmlFor="edit-scope" className="mb-2 block font-medium">Rozsah úpravy vzhledu a modelu</label>
        <select id="edit-scope" value={editScope} onChange={e => setEditScope(e.target.value)} className="w-full rounded-md border border-control px-3 py-2">
          <option value="piece">Jen tento kus (#{vehicle?.id})</option>
          <option value="variant">Všechny kusy této varianty</option>
        </select>
        <p className="mt-2 text-secondary">{editScope === 'piece' ? 'Změna vzhledu se týká jen tohoto kusu. ' : 'Obrázek a údaje modelu se změní všem kusům varianty. '}DCC, výbava, číslo a poznámky se vždy mění jen u kusu #{vehicle?.id}.</p>
      </div>}
      {form.type === 'wagon' && !isEdit && <label className="block text-sm font-medium">Počet kusů
        <input type="number" min={1} max={1000} step={1} required value={quantity} onChange={e=>setQuantity(Number(e.target.value))} className="mt-1 block w-28 rounded-md border border-control px-3 py-2" />
        <span className="mt-1 block font-normal text-secondary">DCC a výbava se při vytvoření vyplní jen prvnímu kusu; u ostatních bude výbava nastavena na Ne a DCC zůstane prázdné.</span>
      </label>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Označení *</label>
          <input
            required
            value={form.designation}
            onChange={(e) => set("designation", e.target.value)}
            className="w-full rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
            placeholder="Amz 61, 362..."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Dopravce</label>
          <input
            value={form.operator}
            onChange={(e) => set("operator", e.target.value)}
            className="w-full rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
            placeholder="ČD, ÖBB..."
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="vehicle-type">Typ *</label>
          <select
            id="vehicle-type"
            value={form.type === "loco" ? "loco" : form.wagonKind === "freight" ? "freight" : "wagon"}
            onChange={(e) => setForm(f => ({ ...f, type: e.target.value === "loco" ? "loco" : "wagon", wagonKind: e.target.value === "freight" ? "freight" : "passenger", classType: e.target.value === "freight" ? "" : f.classType }))}
            className="w-full rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
          >
            <option value="loco">Lokomotiva</option>
            <option value="wagon">Osobní vůz</option>
            <option value="freight">Nákladní vůz</option>
          </select>
        </div>
        {!(form.type === "wagon" && form.wagonKind === "freight") && <div>
          <label className="mb-1 block text-sm font-medium">Třída</label>
          <select
            value={form.classType}
            onChange={(e) => set("classType", e.target.value)}
            className="w-full rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
          >
            <option value="">—</option>
            <option value="1">1. třída</option>
            <option value="2">2. třída</option>
            <option value="12">1. a 2. třída</option>
            <option value="restaurant">Restaurační</option>
            <option value="sleeping">Lůžkový</option>
            <option value="couchette">Lehátkový</option>
            <option value="luggage">Zavazadlový / poštovní</option>
          </select>
        </div>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Cesta k obrázku
        </label>
        <input
          value={form.imagePath}
          onChange={(e) => set("imagePath", e.target.value)}
          className="w-full rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
          placeholder="/img/nazev.gif"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Šířka obrázku (px)
          </label>
          <input
            type="number"
            value={form.imageWidth || ""}
            onChange={(e) =>
              set("imageWidth", e.target.value ? parseInt(e.target.value) : null)
            }
            className="w-full rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Výška obrázku (px)
          </label>
          <input
            type="number"
            value={form.imageHeight || ""}
            onChange={(e) =>
              set(
                "imageHeight",
                e.target.value ? parseInt(e.target.value) : null
              )
            }
            className="w-full rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="model-manufacturer" className="mb-1 block text-sm font-medium">Výrobce</label>
          <select
            id="model-manufacturer"
            value={customManufacturer ? '__custom__' : selectedManufacturer}
            onChange={(e) => {
              const custom = e.target.value === '__custom__';
              setCustomManufacturer(custom);
              set("manufacturer", custom ? '' : e.target.value);
            }}
            className="w-full rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
          >
            <option value="">Nevyplněno</option>
            {manufacturerChoices.map(name => <option key={name} value={name}>{name}</option>)}
            <option value="__custom__">Jiný výrobce…</option>
          </select>
          {customManufacturer && <div className="mt-2">
            <label htmlFor="custom-manufacturer" className="mb-1 block text-sm font-medium">Název výrobce</label>
            <input id="custom-manufacturer" required value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} className="w-full rounded-md border border-control px-3 py-2 text-sm" />
          </div>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Katalogové číslo
          </label>
          <input
            value={form.catalogNumber}
            onChange={(e) => set("catalogNumber", e.target.value)}
            className="w-full rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
            placeholder="73219"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Výchozí DCC adresa</label>
          <input
            type="number"
            min={1}
            max={10239}
            step={1}
            value={form.dccAddress ?? ""}
            onChange={(e) =>
              set(
                "dccAddress",
                e.target.value ? parseInt(e.target.value) : null
              )
            }
            className="w-full rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
            placeholder="3"
          />
        </div>
      </div>

      {form.type === 'wagon' && <fieldset className="grid gap-4 rounded-lg border border-divider p-4 sm:grid-cols-2">
        <legend className="px-2 text-sm font-semibold">Výbava konkrétního kusu{vehicle?.id ? ` #${vehicle.id}` : ''}</legend>
        <div>
          <label htmlFor="magnetic-couplers" className="mb-1 block text-sm font-medium">Magnetická spřáhla</label>
          <select id="magnetic-couplers" value={couplerMode} onChange={e => {
            const mode = e.target.value;
            setForm(f => ({ ...f, magneticCouplerA: mode === 'both' || (mode === 'one' && !f.magneticCouplerB), magneticCouplerB: mode === 'both' || (mode === 'one' && !!f.magneticCouplerB) }));
          }} className="w-full rounded-md border border-control px-3 py-2 text-sm">
            <option value="none">Bez magnetických spřáhel</option>
            <option value="one">Na jednom konci</option>
            <option value="both">Na obou koncích</option>
          </select>
        </div>
        {couplerMode === 'one' && <div>
          <label htmlFor="magnetic-coupler-end" className="mb-1 block text-sm font-medium">Magnetický konec</label>
          <select id="magnetic-coupler-end" value={form.magneticCouplerB ? 'B' : 'A'} onChange={e => setForm(f => ({ ...f, magneticCouplerA: e.target.value === 'A', magneticCouplerB: e.target.value === 'B' }))} className="w-full rounded-md border border-control px-3 py-2 text-sm">
            <option value="A">Konec A</option><option value="B">Konec B</option>
          </select>
          <p className="mt-1 text-xs text-secondary">A a B jsou pevné konce vozu, nezávislé na otočení v soupravě.</p>
        </div>}
        {wagonEquipmentFields.filter(([key]) => key !== 'magneticCouplerA' && key !== 'magneticCouplerB').map(([key,label]) => <label key={key} className="flex min-h-9 items-center gap-2 text-sm">
          <input type="checkbox" checked={form[key] ?? false} onChange={e=>set(key,e.target.checked)} />{label}
        </label>)}
        <p className="text-xs text-secondary sm:col-span-2">Reproduktor evidujte samostatně, i když je připojen k dekodéru v lokomotivě. V soupravě tak snadno vyberete tento kus hned za lokomotivu.</p>
        <div className="text-sm font-medium">
          <label htmlFor="hasLights">Osvětlení vozu</label>
          <select id="hasLights" value={String(form.hasLights ?? false)} onChange={e=>set('hasLights',e.target.value === 'true')} className="mt-1 block w-full rounded-md border border-control px-3 py-2">
            <option value="false">Ne</option><option value="true">Ano</option>
          </select>
          <p className="mt-1 text-xs font-normal text-secondary">Koncová světla evidujte zvlášť.</p>
        </div>
        <label className="text-sm font-medium sm:col-span-2">Číslo / označení konkrétního kusu
          <input value={form.runningNumber ?? ''} onChange={e=>set('runningNumber',e.target.value)} className="mt-1 block w-full rounded-md border border-control px-3 py-2" />
        </label>
      </fieldset>}
      <label className="flex min-h-9 items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isWeathered ?? false} onChange={e => set("isWeathered", e.target.checked)} />
        Patinováno (tento konkrétní kus)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isTemplate ?? false} onChange={e => set("isTemplate", e.target.checked)} />
        Ukázka / předloha (vynechat z běžné synchronizace)
      </label>

      <div>
        <label className="mb-1 block text-sm font-medium">Poznámky</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          className="w-full rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
        />
      </div>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="ui-button ui-button-primary"
        >
          {saving ? "Ukládám..." : isEdit ? "Uložit změny" : "Vytvořit vozidlo"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="ui-button ui-button-quiet"
        >
          Zrušit
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="ui-button ui-button-danger ml-auto"
          >
            Smazat
          </button>
        )}
      </div>
    </form>
  );
}
