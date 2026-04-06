"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

type Vehicle = {
  id: number;
  designation: string;
  operator: string | null;
  type: string;
};

type TrainVehicleRow = {
  id: number;
  position: number;
  vehicleId: number;
  designation: string;
  operator: string | null;
  vehicleType: string;
  classType: string | null;
  dccAddressOverride: number | null;
  lightingDecoderAddress: number | null;
  notes: string | null;
};

type Props = {
  trainId: number;
  trainVehicles: TrainVehicleRow[];
  allVehicles: Vehicle[];
};

export function TrainVehicleManager({
  trainId,
  trainVehicles,
  allVehicles,
}: Props) {
  const router = useRouter();
  const [addVehicleId, setAddVehicleId] = useState("");
  const [busy, setBusy] = useState(false);

  async function addVehicle() {
    if (!addVehicleId) return;
    setBusy(true);
    await fetch(`/api/vlaky/${trainId}/vozidla`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId: parseInt(addVehicleId) }),
    });
    setAddVehicleId("");
    setBusy(false);
    router.refresh();
  }

  async function moveVehicle(trainVehicleId: number, direction: "up" | "down") {
    setBusy(true);
    await fetch(`/api/vlaky/${trainId}/vozidla`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "move", trainVehicleId, direction }),
    });
    setBusy(false);
    router.refresh();
  }

  async function removeVehicle(trainVehicleId: number) {
    if (!confirm("Odebrat vozidlo ze soupravy?")) return;
    setBusy(true);
    await fetch(`/api/vlaky/${trainId}/vozidla`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trainVehicleId }),
    });
    setBusy(false);
    router.refresh();
  }

  function classLabel(classType: string | null) {
    if (!classType) return null;
    if (classType === "1") return "1. tř.";
    if (classType === "2") return "2. tř.";
    if (classType === "restaurant") return "Rest.";
    return classType;
  }

  return (
    <div className="rounded-lg border border-gray-200">
      <h2 className="border-b border-gray-200 px-4 py-3 font-semibold">
        Seznam vozidel
      </h2>

      {trainVehicles.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
              <th className="px-4 py-2 w-10">#</th>
              <th className="px-4 py-2">Vozidlo</th>
              <th className="px-4 py-2">Třída</th>
              <th className="px-4 py-2">DCC</th>
              <th className="px-4 py-2">Osvětlení</th>
              <th className="px-4 py-2">Poznámky</th>
              <th className="px-4 py-2 w-24">Řazení</th>
            </tr>
          </thead>
          <tbody>
            {trainVehicles.map((tv, i) => (
              <tr
                key={tv.id}
                className="border-b border-gray-50 hover:bg-gray-50"
              >
                <td className="px-4 py-2 text-gray-400">{tv.position}</td>
                <td className="px-4 py-2 font-medium">
                  <Link
                    href={`/${tv.vehicleType === "loco" ? "lokomotivy" : "vozy"}/${tv.vehicleId}`}
                    className="hover:text-blue-600"
                  >
                    {tv.operator && (
                      <span className="text-gray-400">{tv.operator} </span>
                    )}
                    {tv.designation}
                  </Link>
                  <span className="ml-1 text-[10px] uppercase text-gray-300">
                    {tv.vehicleType === "loco" ? "lok" : "vůz"}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {tv.vehicleType === "loco" ? (
                    <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium uppercase text-white">
                      Lok
                    </span>
                  ) : (
                    classLabel(tv.classType) || "—"
                  )}
                </td>
                <td className="px-4 py-2 font-mono text-gray-500">
                  {tv.dccAddressOverride || "—"}
                </td>
                <td className="px-4 py-2 font-mono text-gray-500">
                  {tv.lightingDecoderAddress || "—"}
                </td>
                <td className="px-4 py-2 text-xs text-gray-400">{tv.notes}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveVehicle(tv.id, "up")}
                      disabled={i === 0 || busy}
                      className="rounded px-1.5 py-0.5 text-xs hover:bg-gray-200 disabled:opacity-30"
                      title="Nahoru"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveVehicle(tv.id, "down")}
                      disabled={i === trainVehicles.length - 1 || busy}
                      className="rounded px-1.5 py-0.5 text-xs hover:bg-gray-200 disabled:opacity-30"
                      title="Dolů"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeVehicle(tv.id)}
                      disabled={busy}
                      className="ml-1 rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50 disabled:opacity-30"
                      title="Odebrat"
                    >
                      ×
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-3">
        <select
          value={addVehicleId}
          onChange={(e) => setAddVehicleId(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">Vyberte vozidlo...</option>
          {allVehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.operator ? `${v.operator} ` : ""}
              {v.designation} ({v.type === "loco" ? "lok" : "vůz"})
            </option>
          ))}
        </select>
        <button
          onClick={addVehicle}
          disabled={!addVehicleId || busy}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          Přidat
        </button>
      </div>
    </div>
  );
}
