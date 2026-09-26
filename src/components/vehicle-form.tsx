"use client";

import { vehicleSection } from "@/lib/vehicle-kind";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Vehicle = {
  id?: number;
  wagonVariantId?: number | null;
  magneticCouplers?: boolean | null;
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

export function VehicleForm({ vehicle }: { vehicle?: Vehicle }) {
  const router = useRouter();
  const [form, setForm] = useState<Vehicle>({ ...defaults, ...vehicle });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editScope, setEditScope] = useState("piece");
  const [quantity, setQuantity] = useState(1);

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
        <span className="mt-1 block font-normal text-secondary">DCC a výbava se při vytvoření vyplní jen prvnímu kusu; ostatní zůstanou nezjištěné.</span>
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
          <label className="mb-1 block text-sm font-medium">Výrobce</label>
          <input
            value={form.manufacturer}
            onChange={(e) => set("manufacturer", e.target.value)}
            className="w-full rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
            placeholder="Roco, ACME..."
          />
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
        {(['magneticCouplers','hasLights'] as const).map(key => <div key={key} className="text-sm font-medium">
          <label htmlFor={key}>{key === 'magneticCouplers' ? 'Magnetická spřáhla' : 'Osvětlení'}</label>
          <select id={key} value={form[key] == null ? '' : String(form[key])} onChange={e=>set(key,e.target.value === '' ? null : e.target.value === 'true')} className="mt-1 block w-full rounded-md border border-control px-3 py-2">
            <option value="">Nezjištěno</option><option value="true">Ano</option><option value="false">Ne</option>
          </select>
        </div>)}
        <label className="text-sm font-medium sm:col-span-2">Číslo / označení konkrétního kusu
          <input value={form.runningNumber ?? ''} onChange={e=>set('runningNumber',e.target.value)} className="mt-1 block w-full rounded-md border border-control px-3 py-2" />
        </label>
      </fieldset>}
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
