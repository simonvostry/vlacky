"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { parseTheme, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event("vlacky-theme-change"));
}
function subscribe(notify: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === THEME_STORAGE_KEY || event.key === null) applyTheme(parseTheme(event.newValue));
  }
  window.addEventListener("vlacky-theme-change", notify);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("vlacky-theme-change", notify);
    window.removeEventListener("storage", onStorage);
  };
}
const snapshot = () => parseTheme(document.documentElement.dataset.theme);
const serverSnapshot = (): Theme => "light";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const label = theme === "light" ? "Přepnout na tmavý režim" : "Přepnout na světlý režim";
  return <button type="button" className="ui-icon-button theme-toggle" aria-label={label} title={label}
    aria-pressed={theme === "dark"} onClick={() => {
      const next = theme === "light" ? "dark" : "light";
      applyTheme(next);
      try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* The in-page choice still works. */ }
    }}>
    <MoonIcon className="theme-moon size-5" aria-hidden="true" />
    <SunIcon className="theme-sun size-5" aria-hidden="true" />
  </button>;
}
