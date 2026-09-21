"use client";

import { useSyncExternalStore } from "react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { parseHiddenTrainLabels, TRAIN_DISPLAY_STORAGE_KEY, type TrainLabel } from "@/lib/train-display";

const options: { key: TrainLabel; label: string; description: string }[] = [
  { key: "operator", label: "Dopravce", description: "Logo nebo název dopravce" },
  { key: "number", label: "Číslo", description: "Číslo vozu v soupravě, např. 373" },
  { key: "class", label: "Třída", description: "Vozová třída" },
  { key: "type", label: "Typ", description: "Označení vozidla, např. Bmz 61 nebo 642" },
];
const changeEvent = "vlacky-train-display-change";
function apply(value: string) {
  document.documentElement.dataset.trainLabelsHidden = value;
  window.dispatchEvent(new Event(changeEvent));
}
function subscribe(notify: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === TRAIN_DISPLAY_STORAGE_KEY || event.key === null) apply(parseHiddenTrainLabels(event.newValue));
  }
  window.addEventListener(changeEvent, notify);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changeEvent, notify);
    window.removeEventListener("storage", onStorage);
  };
}
const snapshot = () => parseHiddenTrainLabels(document.documentElement.dataset.trainLabelsHidden);
const serverSnapshot = () => "";

export function TrainDisplayControls() {
  const hidden = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return (
    <div role="group" aria-label="Zobrazení údajů vozidel" className="flex flex-wrap items-center justify-end gap-1">
      {options.map(({ key, label, description }) => {
        const enabled = !hidden.split(" ").includes(key);
        return (
          <button key={key} type="button" aria-pressed={enabled} title={description}
            className={`ui-button gap-1 px-2 ${enabled ? "bg-muted text-accent" : "text-secondary hover:bg-muted"}`}
            onClick={() => {
              const next = parseHiddenTrainLabels(enabled ? `${hidden} ${key}` : hidden.split(" ").filter(item => item !== key).join(" "));
              apply(next);
              try { localStorage.setItem(TRAIN_DISPLAY_STORAGE_KEY, next); } catch { /* Switching still works for this page. */ }
            }}>
            <CheckIcon aria-hidden="true" className={`size-3.5 ${enabled ? "" : "invisible"}`} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
