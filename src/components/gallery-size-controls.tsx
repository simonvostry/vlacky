"use client";

import { useSyncExternalStore } from "react";
import { GALLERY_SIZES, GALLERY_SIZE_STORAGE_KEY, parseGallerySize, type GallerySize } from "@/lib/gallery-size";

const options = { small: { label: "Malé", percent: 100 }, medium: { label: "Střední", percent: 125 }, large: { label: "Velké", percent: 150 } };
const changeEvent = "vlacky-gallery-size-change";
function apply(size: GallerySize) {
  document.documentElement.dataset.gallerySize = size;
  window.dispatchEvent(new Event(changeEvent));
}
function subscribe(notify: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === GALLERY_SIZE_STORAGE_KEY || event.key === null) apply(parseGallerySize(event.newValue));
  }
  window.addEventListener(changeEvent, notify);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changeEvent, notify);
    window.removeEventListener("storage", onStorage);
  };
}
const snapshot = () => parseGallerySize(document.documentElement.dataset.gallerySize);
const serverSnapshot = (): GallerySize => "small";

export function GallerySizeControls({ visible }: { visible: boolean }) {
  const size = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  if (!visible) return null;
  return <div role="group" aria-label="Velikost obrázků" className="flex items-center gap-1">
    {GALLERY_SIZES.map(value => <button key={value} type="button" aria-pressed={size === value}
      title={`Velikost obrázků: ${options[value].percent} %`}
      className={`ui-button px-2 ${size === value ? "bg-muted text-accent" : "text-secondary hover:bg-muted"}`}
      onClick={() => {
        apply(value);
        try { localStorage.setItem(GALLERY_SIZE_STORAGE_KEY, value); } catch { /* Keep the in-page choice. */ }
      }}>{options[value].label}</button>)}
  </div>;
}
