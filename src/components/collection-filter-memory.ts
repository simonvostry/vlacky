"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { COLLECTION_FILTER_ROUTES, COLLECTION_FILTER_STORAGE_KEY, filterMemoryHref,
  hasExplicitFilters, isFilterCollection, rememberedFilterQuery, FILTER_STATE_MARKER } from "@/lib/collection-filter-memory";

const changeEvent = "vlacky-collection-filters-change";
const fallback = new Map<string, string>();
function read(path: string): string {
  if (fallback.has(path)) return fallback.get(path)!;
  try {
    return rememberedFilterQuery(path, localStorage.getItem(`${COLLECTION_FILTER_STORAGE_KEY}:${path}`) || "");
  } catch { return fallback.get(path) || ""; }
}
export function rememberCollectionFilters(path: string, query: string) {
  if (!isFilterCollection(path)) return;
  const value = rememberedFilterQuery(path, query);
  if (read(path) === value && fallback.get(path) === value) return;
  fallback.set(path, value);
  try { localStorage.setItem(`${COLLECTION_FILTER_STORAGE_KEY}:${path}`, value); } catch { /* In-app navigation still remembers. */ }
  window.dispatchEvent(new Event(changeEvent));
}
function subscribe(notify: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === null) { fallback.clear(); notify(); }
    else if (event.key.startsWith(`${COLLECTION_FILTER_STORAGE_KEY}:`)) {
      fallback.delete(event.key.slice(COLLECTION_FILTER_STORAGE_KEY.length + 1));
      notify();
    }
  };
  window.addEventListener(changeEvent, notify);
  window.addEventListener("storage", storage);
  return () => { window.removeEventListener(changeEvent, notify); window.removeEventListener("storage", storage); };
}
const snapshot = () => JSON.stringify(COLLECTION_FILTER_ROUTES.map(path => read(path)));
const serverSnapshot = () => "[]";

/** Lives in the persistent navigation, including while viewing details and other tabs. */
export function useCollectionFilterMemory() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const router = useRouter();
  const stored = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  useEffect(() => {
    if (!isFilterCollection(pathname)) return;
    if (hasExplicitFilters(pathname, query)) {
      rememberCollectionFilters(pathname, query);
      return;
    }
    const saved = read(pathname);
    if (saved) {
      const params = new URLSearchParams(query);
      for (const [key, value] of new URLSearchParams(saved)) params.set(key, value);
      params.set(FILTER_STATE_MARKER, "1");
      router.replace(`${pathname}?${params}`, { scroll: false });
    } else rememberCollectionFilters(pathname, query);
  }, [pathname, query, router]);
  const values: string[] = JSON.parse(stored);
  return (path: string) => {
    const index = (COLLECTION_FILTER_ROUTES as readonly string[]).indexOf(path);
    return index < 0 || values[index] === undefined ? path : filterMemoryHref(path, values[index]);
  };
}
