"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { CollectionToolbar } from "./collection-toolbar";
import { FILTER_STATE_MARKER, resetFilterQuery } from "@/lib/collection-filter-memory";
import { rememberCollectionFilters } from "./collection-filter-memory";
import type { FilterKey, FilterOption } from "@/lib/collection-filters";

export function CollectionFilters({ filters, count, total, wagons = false, catalog = false }: {
  filters: { key: FilterKey; label: string; options: FilterOption[] }[];
  count: number; total: number; wagons?: boolean; catalog?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  function update(key?: FilterKey, value?: string) {
    const params = new URLSearchParams(key ? search.toString() : resetFilterQuery(pathname, search.toString()));
    if (key) { if (value) params.set(key, value); else params.delete(key); }
    params.set(FILTER_STATE_MARKER, "1");
    rememberCollectionFilters(pathname, params.toString());
    startTransition(() => router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false }));
  }
  return (
    <CollectionToolbar>
      <section aria-label="Filtry sbírky" aria-busy={pending} className="flex flex-wrap items-center gap-2 py-2">
        {filters.map(filter => {
          const value = search.get(filter.key) || "";
          return <label key={filter.key} className="min-w-32 flex-[1_1_8rem] sm:flex-none">
            <span className="sr-only">{filter.label}</span>
            <select aria-label={filter.label} title={filter.label} value={value} disabled={pending} onChange={e => update(filter.key, e.target.value)} className={`w-full ${filter.key === "rada" ? "sm:w-44" : filter.key === "skupina" ? "sm:w-48" : "sm:w-36"}`}>
              <option value="">{filter.key === "skupina" ? "Konstrukce" : filter.label}: vše</option>
              {value && !filter.options.some(o => o.value === value) && <option value={value}>Nedostupná volba</option>}
              {filter.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>;
        })}
        <button type="button" onClick={() => update()} disabled={pending} aria-label="Resetovat filtry" title="Resetovat filtry" className="ui-icon-button">
          <ArrowPathIcon className="size-4" aria-hidden="true" />
        </button>
        <p role="status" className="whitespace-nowrap text-xs tabular-nums text-secondary">{count} / {total}<span className="sr-only"> {catalog ? "typů vozidel" : wagons ? "variant" : "lokomotiv"}</span></p>
      </section>
    </CollectionToolbar>
  );
}
