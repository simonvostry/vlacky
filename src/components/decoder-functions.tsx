"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DecoderFn = {
  id: number;
  functionNumber: number;
  label: string;
  description: string | null;
};

type Props = {
  vehicleId: number;
  functions: DecoderFn[];
};

const presets = [
  { fn: 0, label: "Světla", desc: "Přední/zadní čelní světla" },
  { fn: 1, label: "Vnitřní osvětlení", desc: "Interiér vozu" },
  { fn: 2, label: "Zvuk", desc: "Zapnutí/vypnutí zvuku" },
  { fn: 3, label: "Houkačka", desc: "Zvukový signál" },
  { fn: 4, label: "ABV", desc: "Pomocný brzdič" },
];

export function DecoderFunctions({ vehicleId, functions }: Props) {
  const router = useRouter();
  const [newFn, setNewFn] = useState({ functionNumber: 0, label: "", description: "" });
  const [busy, setBusy] = useState(false);

  async function addFunction() {
    if (!newFn.label) return;
    setBusy(true);
    await fetch(`/api/vozidla/${vehicleId}/funkce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newFn),
    });
    setNewFn({ functionNumber: 0, label: "", description: "" });
    setBusy(false);
    router.refresh();
  }

  async function removeFunction(functionId: number) {
    setBusy(true);
    await fetch(`/api/vozidla/${vehicleId}/funkce`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ functionId }),
    });
    setBusy(false);
    router.refresh();
  }

  async function applyPresets() {
    setBusy(true);
    for (const p of presets) {
      const exists = functions.some((f) => f.functionNumber === p.fn);
      if (!exists) {
        await fetch(`/api/vozidla/${vehicleId}/funkce`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            functionNumber: p.fn,
            label: p.label,
            description: p.desc,
          }),
        });
      }
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-gray-200">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="font-semibold">Funkce dekodéru</h2>
        {functions.length === 0 && (
          <button
            onClick={applyPresets}
            disabled={busy}
            className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50"
          >
            Vložit předvolby
          </button>
        )}
      </div>

      {functions.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
              <th className="w-16 px-4 py-2">Funkce</th>
              <th className="px-4 py-2">Název</th>
              <th className="px-4 py-2">Popis</th>
              <th className="w-12 px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {functions.map((f) => (
              <tr
                key={f.id}
                className="border-b border-gray-50 hover:bg-gray-50"
              >
                <td className="px-4 py-2 font-mono text-gray-500">
                  F{f.functionNumber}
                </td>
                <td className="px-4 py-2 font-medium">{f.label}</td>
                <td className="px-4 py-2 text-gray-500">{f.description}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => removeFunction(f.id)}
                    disabled={busy}
                    className="text-xs text-red-400 hover:text-red-600 disabled:opacity-30"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-3">
        <input
          type="number"
          min="0"
          max="28"
          value={newFn.functionNumber}
          onChange={(e) =>
            setNewFn((f) => ({
              ...f,
              functionNumber: parseInt(e.target.value) || 0,
            }))
          }
          className="w-16 rounded-md border border-gray-300 px-2 py-2 text-center text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          placeholder="F0"
        />
        <input
          value={newFn.label}
          onChange={(e) => setNewFn((f) => ({ ...f, label: e.target.value }))}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          placeholder="Název funkce"
        />
        <input
          value={newFn.description}
          onChange={(e) =>
            setNewFn((f) => ({ ...f, description: e.target.value }))
          }
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          placeholder="Popis (volitelný)"
        />
        <button
          onClick={addFunction}
          disabled={!newFn.label || busy}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          Přidat
        </button>
      </div>
    </div>
  );
}
