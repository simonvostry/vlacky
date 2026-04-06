"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Vehicle = {
  id?: number;
  designation: string;
  operator: string;
  type: string;
  classType: string;
  imagePath: string;
  imageWidth: number | null;
  imageHeight: number | null;
  manufacturer: string;
  catalogNumber: string;
  dccAddress: number | null;
  notes: string;
};

const defaults: Vehicle = {
  designation: "",
  operator: "",
  type: "wagon",
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

  const isEdit = !!vehicle?.id;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const url = isEdit ? `/api/vozidla/${vehicle!.id}` : "/api/vozidla";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        dccAddress: form.dccAddress || null,
        imageWidth: form.imageWidth || null,
        imageHeight: form.imageHeight || null,
      }),
    });

    if (res.ok) {
      const saved = await res.json();
      const section = saved.type === "loco" ? "lokomotivy" : "vozy";
      router.push(`/${section}/${saved.id}`);
      router.refresh();
    } else {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit || !confirm("Opravdu smazat toto vozidlo?")) return;
    await fetch(`/api/vozidla/${vehicle!.id}`, { method: "DELETE" });
    const section = form.type === "loco" ? "lokomotivy" : "vozy";
    router.push(`/${section}`);
    router.refresh();
  }

  function set<K extends keyof Vehicle>(key: K, value: Vehicle[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Označení *</label>
          <input
            required
            value={form.designation}
            onChange={(e) => set("designation", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder="Amz 61, 362..."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Dopravce</label>
          <input
            value={form.operator}
            onChange={(e) => set("operator", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder="ČD, ÖBB..."
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Typ *</label>
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="loco">Lokomotiva</option>
            <option value="wagon">Vůz</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Třída</label>
          <select
            value={form.classType}
            onChange={(e) => set("classType", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">—</option>
            <option value="1">1. třída</option>
            <option value="2">2. třída</option>
            <option value="restaurant">Restaurační</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Cesta k obrázku
        </label>
        <input
          value={form.imagePath}
          onChange={(e) => set("imagePath", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Výrobce</label>
          <input
            value={form.manufacturer}
            onChange={(e) => set("manufacturer", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder="73219"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">DCC adresa</label>
          <input
            type="number"
            value={form.dccAddress ?? ""}
            onChange={(e) =>
              set(
                "dccAddress",
                e.target.value ? parseInt(e.target.value) : null
              )
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder="3"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Poznámky</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? "Ukládám..." : isEdit ? "Uložit změny" : "Vytvořit vozidlo"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          Zrušit
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            className="ml-auto rounded-md px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Smazat
          </button>
        )}
      </div>
    </form>
  );
}
