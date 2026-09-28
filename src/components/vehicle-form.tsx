"use client";

import { allowsVehicleEditField, type WagonEditMode } from "@/lib/vehicle-edit-fields";
import { FilterDropdown } from "@/components/filter-dropdown";
import Link from "next/link";
import { EPOCHS, epochLabels } from "@/lib/epochs";

import { hasVehicleSound, soundEquipmentPatch } from "@/lib/vehicle-equipment";
import { EquipmentGlyph } from "@/components/equipment-icons";
import { manufacturerKey, manufacturerName, manufacturerOptions } from "@/lib/model-manufacturers";
import { vehicleSection } from "@/lib/vehicle-kind";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Vehicle = {
  id?: number;
  description?: string | null; referenceNotes?: string | null;
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
  lengthOverBuffersMm?: number | null;
  epochs?: number[];
  epochNotes?: string | null;
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
  lengthOverBuffersMm: null,
  epochs: [], epochNotes: null, description: null, referenceNotes: null,
  dccAddress: null,
  notes: "",
};

export type CatalogReferenceOption = { id: number; label: string; images: { id: number; label: string }[] };

export function VehicleForm({ vehicle, manufacturers = [], editMode, catalogReferences = [] }: {
  vehicle?: Vehicle; manufacturers?: string[]; editMode?: WagonEditMode;
  catalogReferences?: CatalogReferenceOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<Vehicle>({ ...defaults, ...vehicle, hasLights: vehicle?.hasLights ?? false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customManufacturer, setCustomManufacturer] = useState(false);
  const manufacturerChoices = manufacturerOptions([...manufacturers, vehicle?.manufacturer ?? null]);
  const selectedManufacturer = manufacturerChoices.find(name => manufacturerKey(name) === manufacturerKey(form.manufacturer)) ?? manufacturerName(form.manufacturer);
  const couplerMode = form.magneticCouplerA && form.magneticCouplerB ? 'both' : form.magneticCouplerA || form.magneticCouplerB ? 'one' : 'none';

  const isEdit = !!vehicle?.id;
  const mode = isEdit && vehicle?.type === 'wagon' ? editMode ?? 'model' : undefined;
  const showModel = mode !== 'piece';
  const showPiece = mode !== 'model';
  const catalogReference = catalogReferences.find(c => c.id === form.catalogId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {

      const url = isEdit ? `/api/vozidla/${vehicle!.id}` : "/api/vozidla";
      const method = isEdit ? "PUT" : "POST";

      const normalize = (value: Vehicle) => ({
        ...value,
        manufacturer: value.manufacturer.trim(),
        dccAddress: value.dccAddress || null,
        imageWidth: value.imageWidth || null,
        imageHeight: value.imageHeight || null,
        catalogId: value.catalogId || null,
        catalogImageId: value.catalogImageId || null,
      });
      const current = normalize(form);
      const initial = normalize({ ...defaults, ...vehicle, hasLights: vehicle?.hasLights ?? false });
      // Saving equipment from an older open form must not undo newer shared
      // details. Send only fields the user actually changed on edit.
      const payload = isEdit
        ? Object.fromEntries(Object.entries(current).filter(([key, value]) => (!mode || allowsVehicleEditField(mode, key)) && JSON.stringify(value) !== JSON.stringify(initial[key as keyof typeof initial])))
        : { ...current, quantity: form.type === "wagon" ? quantity : 1 };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode ? { ...payload, editMode: mode } : payload),
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
    if (!isEdit || !showPiece || !confirm(mode === "piece" ? `Opravdu smazat kus #${vehicle?.id} včetně jeho nastavení?` : "Opravdu smazat toto vozidlo?")) return;
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
      {mode && <p className="rounded-lg bg-subtle p-4 text-sm text-secondary">
        {mode === 'model' ? 'Společné údaje se uloží všem kusům této varianty.' : `Nastavení se uloží pouze kusu #${vehicle?.id}.`}
      </p>}
      {showModel && <>
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

      </div>

      {mode === 'model' && <fieldset className="min-w-0 space-y-3 rounded-lg border border-divider p-4">
        <legend className="px-2 text-sm font-semibold">Odkaz na katalog</legend>
        <FilterDropdown label="Katalogová předloha" emptyLabel="Bez katalogové předlohy"
          value={form.catalogId ? String(form.catalogId) : ''}
          options={catalogReferences.map(c => ({ value: String(c.id), label: c.label }))}
          onChange={value => setForm(f => ({ ...f, catalogId: value ? Number(value) : null, catalogImageId: null }))} />
        {catalogReference && <>
          <FilterDropdown label="Katalogová barevná varianta" emptyLabel="Bez konkrétní barevné varianty"
            value={form.catalogImageId ? String(form.catalogImageId) : ''}
            options={catalogReference.images.map(i => ({ value: String(i.id), label: i.label }))}
            onChange={value => set('catalogImageId', value ? Number(value) : null)} />
          <Link href={`/katalog/${catalogReference.id}`} className="inline-block text-sm text-accent underline">Otevřít katalogovou předlohu</Link>
        </>}
        <p className="text-xs text-secondary">Změna odkazu nepřepisuje obrázek ani další údaje modelu.</p>
      </fieldset>}

      <fieldset className="rounded-lg border border-divider p-4">
        <legend className="px-2 text-sm font-semibold">Epocha</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {EPOCHS.map(epoch => <label key={epoch} className={`flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm ${form.epochs?.includes(epoch) ? 'border-accent bg-accent-soft text-accent' : 'border-control'}`}>
            <input type="checkbox" checked={form.epochs?.includes(epoch) ?? false} aria-label={`Epocha ${epochLabels[epoch]}`}
              onChange={e => setForm(f => ({...f, epochs: e.target.checked ? [...(f.epochs ?? []),epoch].sort((a,b)=>a-b) : (f.epochs ?? []).filter(n=>n!==epoch), epochNotes: null}))} />
            {epochLabels[epoch]}
          </label>)}
        </div>
        <p className="mt-2 text-xs text-secondary">Lze vybrat více epoch podle nátěru a označení modelu. Bez výběru = nevyplněno. Hranice epoch se liší podle země.</p>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-secondary">Zdroj a upřesnění epochy</summary>
          <label htmlFor="epoch-notes" className="sr-only">Zdroj a upřesnění epochy</label>
          <textarea id="epoch-notes" rows={3} maxLength={5000} value={form.epochNotes ?? ''} onChange={e=>set('epochNotes',e.target.value || null)} className="mt-2 w-full rounded-md border border-control px-3 py-2 text-sm" />
          <p className="mt-1 text-xs text-secondary">Odkaz na výrobce nebo zdůvodnění. Změna výběru původní zdroj vymaže, aby se nevztahoval k jinému zařazení.</p>
        </details>
      </fieldset>

      <div>
        <label htmlFor="vehicle-length" className="mb-1 block text-sm font-medium">Délka přes nárazníky (mm)</label>
        <input id="vehicle-length" type="number" min="0" max="10000" step="any"
          value={form.lengthOverBuffersMm ?? ""}
          onChange={e => set("lengthOverBuffersMm", e.target.value === "" ? null : Number(e.target.value))}
          aria-describedby="vehicle-length-help"
          className="w-full rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
          placeholder="Nevyplněno" />
        <p id="vehicle-length-help" className="mt-1 text-xs text-secondary">Délka fyzického modelu, nikoli skutečného vozidla. U trvale spojené jednotky celková délka; u sady samostatných vozů délka jednoho vozu.</p>
      </div>

      </>}
      {showModel && <label className="mb-4 block text-sm font-medium">Popis vozu / lokomotivy
        <textarea rows={3} maxLength={5000} value={form.description ?? ''} onChange={e => set('description',e.target.value || null)} className="mt-1 w-full rounded-md border border-control px-3 py-2 text-sm" />
        <span className="mt-1 block text-xs font-normal text-secondary">Stručný popis předlohy, uspořádání a vybavení. Společný pro všechny stejné modely.</span>
      </label>}
      {showPiece && <>
      {form.type === 'wagon' && !mode && <h2 className="pt-4 text-lg font-semibold">Konkrétní kus{vehicle?.id ? ` #${vehicle.id}` : ''}</h2>}
        <div>
          <label htmlFor="piece-dcc-address" className="mb-1 block text-sm font-medium">DCC adresa</label>
          <input
            type="number"
            min={1}
            max={10239}
            step={1}
            id="piece-dcc-address"
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

      {form.type === 'wagon' && <fieldset className="grid gap-4 rounded-lg border border-divider p-4 sm:grid-cols-2">
        <legend className="px-2 text-sm font-semibold">Výbava konkrétního kusu{vehicle?.id ? ` #${vehicle.id}` : ''}</legend>
        <div>
          <label htmlFor="magnetic-couplers" className="mb-1 block text-sm font-medium"><span className="inline-flex items-center gap-2"><EquipmentGlyph name="coupler" />Magnetická spřáhla</span></label>
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
        <label className="flex min-h-9 items-center gap-2 text-sm">
          <input type="checkbox" checked={form.hasTailLights ?? false} onChange={e=>set('hasTailLights',e.target.checked)} />
          <EquipmentGlyph name="tail" />Červená koncová světla
        </label>
        <label className="flex min-h-9 items-center gap-2 text-sm">
          <input type="checkbox" checked={hasVehicleSound(form)} onChange={e=>setForm(f=>({...f, ...soundEquipmentPatch(e.target.checked, f)}))} />
          <EquipmentGlyph name="sound" />Zvuk
        </label>
        <div className="text-sm font-medium">
          <label htmlFor="hasLights" className="inline-flex items-center gap-2"><EquipmentGlyph name="lights" />Osvětlení vozu</label>
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
        <EquipmentGlyph name="weather" />Patinováno (tento konkrétní kus)
      </label>
      <details className="text-sm text-secondary"><summary className="cursor-pointer">Zdroje a původní poznámky</summary><textarea aria-label="Zdroje a původní poznámky" rows={5} maxLength={30000} value={form.referenceNotes ?? ''} onChange={e => set('referenceNotes',e.target.value || null)} className="mt-2 w-full rounded-md border border-control px-3 py-2" /></details>
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

      </>}

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
        {isEdit && showPiece && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="ui-button ui-button-danger ml-auto"
          >
            {mode === 'piece' ? 'Smazat tento kus' : 'Smazat'}
          </button>
        )}
      </div>
    </form>
  );
}
