"use client";

import { vehicleSection } from "@/lib/vehicle-kind";
import { useRouter } from "next/navigation";
import { ArrowUpIcon, ArrowDownIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { useState } from "react";
import Link from "next/link";

type Vehicle = {
  id: number;
  designation: string;
  operator: string | null;
  type: string;
  wagonKind: string;
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
    <div className="rounded-lg border border-divider">
      <h2 className="border-b border-divider px-4 py-3 font-semibold">
        Seznam vozidel
      </h2>

      {trainVehicles.length > 0 && (
        <div className="overflow-x-auto"><table className="w-full text-sm">
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
                  <span className="ml-1 text-[10px] uppercase text-secondary">
                    {tv.vehicleType === "loco" ? "lok" : "vůz"}
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
          onChange={(e) => setAddVehicleId(e.target.value)}
          aria-label="Vozidlo k přidání do soupravy"
          className="min-w-0 flex-1 rounded-md border border-control px-3 py-2 text-sm focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none"
        >
          <option value="">Vyberte vozidlo...</option>
          {available.map((v) => (
            <option key={v.id} value={v.id}>
              {v.operator ? `${v.operator} ` : ""}
              {v.designation} ({v.type === "loco" ? "lok" : v.wagonKind === "freight" ? "nákladní vůz" : "osobní vůz"})
            </option>
          ))}
        </select>
        <button
          onClick={addVehicle}
          disabled={!addVehicleId || busy}
          className="ui-button ui-button-primary"
        >
          Přidat
        </button>
      </div>
    </div>
  );
}
