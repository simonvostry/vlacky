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

function useThemePreference() {
  const theme = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  function choose(next: Theme) {
    applyTheme(next);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* Keep the in-page choice. */ }
  }
  return { theme, choose };
}

export function ThemeChoices() {
  const { theme, choose } = useThemePreference();
  return <div role="group" aria-label="Barevný režim" className="grid grid-cols-2 gap-2">
    {(["light", "dark"] as const).map(value => {
      const Icon = value === "light" ? SunIcon : MoonIcon;
      return <button key={value} type="button" aria-pressed={theme === value}
        onClick={() => choose(value)}
        className={`ui-button ${theme === value ? "bg-muted text-accent" : "text-secondary hover:bg-muted"}`}>
        <Icon className="size-4" aria-hidden="true" />{value === "light" ? "Světlý" : "Tmavý"}
      </button>;
    })}
  </div>;
}

// The unauthenticated login page retains its standalone theme toggle.
export function ThemeToggle() {
  const { theme, choose } = useThemePreference();
  const label = theme === "light" ? "Přepnout na tmavý režim" : "Přepnout na světlý režim";
  return <button type="button" className="ui-icon-button theme-toggle" aria-label={label} title={label}
    aria-pressed={theme === "dark"} onClick={() => choose(theme === "light" ? "dark" : "light")}>
    <MoonIcon className="theme-moon size-5" aria-hidden="true" />
    <SunIcon className="theme-sun size-5" aria-hidden="true" />
  </button>;
}
