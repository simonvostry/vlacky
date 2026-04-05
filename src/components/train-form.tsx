"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Train = {
  id?: number;
  number: string;
  name: string;
  category: string;
  route: string;
  era: string;
  notes: string;
};

const defaults: Train = {
  number: "",
  name: "",
  category: "",
  route: "",
  era: "",
  notes: "",
};

const categories = ["EC", "IC", "Ex", "R", "Sp", "Os", "Nex"];

export function TrainForm({ train }: { train?: Train }) {
  const router = useRouter();
  const [form, setForm] = useState<Train>({ ...defaults, ...train });
  const [saving, setSaving] = useState(false);

  const isEdit = !!train?.id;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const url = isEdit ? `/api/vlaky/${train!.id}` : "/api/vlaky";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const saved = await res.json();
      router.push(`/vlaky/${saved.id}`);
      router.refresh();
    } else {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit || !confirm("Opravdu smazat tento vlak?")) return;
    await fetch(`/api/vlaky/${train!.id}`, { method: "DELETE" });
    router.push("/vlaky");
    router.refresh();
  }

  function set<K extends keyof Train>(key: K, value: Train[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Kategorie</label>
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Číslo vlaku</label>
          <input
            value={form.number}
            onChange={(e) => set("number", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder="70"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Název</label>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder="Antonín Dvořák"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Trasa</label>
        <input
          value={form.route}
          onChange={(e) => set("route", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          placeholder="Wien – Břeclav – Praha"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Období</label>
        <input
          value={form.era}
          onChange={(e) => set("era", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          placeholder="1998/1999"
        />
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
          {saving ? "Ukládám..." : isEdit ? "Uložit změny" : "Vytvořit vlak"}
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
