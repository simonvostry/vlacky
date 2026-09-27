"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { GallerySizeControls } from "./gallery-size-controls";
import { TrainDisplayControls } from "./train-display-controls";

export function DisplaySettings({ visible, gallery }: { visible: boolean; gallery: boolean }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = useId();
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    function onPointerDown(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // The positioned parent is the entire nav action group, keeping the panel inside
  // the viewport even when the gear has theme/account buttons to its right.
  return <div ref={container} hidden={!visible} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    {visible && <button ref={trigger} type="button" aria-label="Nastavení zobrazení"
      title="Nastavení zobrazení" aria-haspopup="dialog" aria-expanded={open} aria-controls={panelId}
      className={`ui-icon-button ${open ? "bg-muted" : ""}`}
      onClick={() => setOpen(value => !value)}
      onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } }}>
      <Cog6ToothIcon className="size-5" aria-hidden="true" />
    </button>}
    <div ref={panel} id={panelId} hidden={!visible || !open} role="dialog" aria-label="Nastavení zobrazení"
      className="absolute right-0 top-full z-20 mt-1 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-divider bg-surface p-4 shadow-lg">
      {gallery && <p className="mb-2 text-sm font-medium">Velikost obrázků</p>}
      <GallerySizeControls visible={gallery} />
      {visible && <p className={`${gallery ? "mt-4" : ""} mb-2 text-sm font-medium`}>Údaje u vozidel</p>}
      <TrainDisplayControls visible={visible} />
    </div>
  </div>;
}
