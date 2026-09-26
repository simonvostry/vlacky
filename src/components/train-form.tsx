"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Train = {
  id?: number;
  kind?: string;
  number: string;
  name: string;
  category: string;
  route: string;
  era: string;
  notes: string;
};

const defaults: Train = {
  kind: "passenger",
  number: "",
  name: "",
  category: "",
  route: "",
  era: "",
  notes: "",
};

const categories = ["EC", "IC", "Ex", "R", "Sp", "Os", "Nex", "Pn", "Mn", "Vn"];

export function TrainForm({ train, kind = "passenger" }: { train?: Train; kind?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<Train>({ ...defaults, kind, ...train });
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
      router.push(`/soupravy/${saved.id}`);
      router.refresh();
    } else {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit || !confirm("Opravdu smazat tento vlak?")) return;
    await fetch(`/api/vlaky/${train!.id}`, { method: "DELETE" });
    router.push(`/soupravy?druh=${form.kind}`);
    router.refresh();
  }

  function set<K extends keyof Train>(key: K, value: Train[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="train-kind" className="mb-1 block text-sm font-medium">Druh soupravy</label>
        <select id="train-kind" value={form.kind} onChange={e => set("kind", e.target.value)} className="w-full rounded-md border border-control px-3 py-2 text-sm">
          <option value="passenger">Osobní</option>
          <option value="freight">Nákladní</option>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Kategorie</label>
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className="w-full rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
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
            className="w-full rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
            placeholder="70"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Název</label>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="w-full rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
            placeholder="Antonín Dvořák"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Trasa</label>
        <input
          value={form.route}
          onChange={(e) => set("route", e.target.value)}
          className="w-full rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
          placeholder="Wien – Břeclav – Praha"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Období</label>
        <input
          value={form.era}
          onChange={(e) => set("era", e.target.value)}
          className="w-full rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
          placeholder="1998/1999"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Poznámky</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          className="w-full rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="ui-button ui-button-primary"
        >
          {saving ? "Ukládám..." : isEdit ? "Uložit změny" : "Vytvořit vlak"}
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
            className="ui-button ui-button-danger ml-auto"
          >
            Smazat
          </button>
        )}
      </div>
    </form>
  );
}
