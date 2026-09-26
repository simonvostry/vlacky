"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { FilterKey, FilterOption } from "@/lib/collection-filters";

export function CollectionFilters({ filters, count, total, wagons = false }: {
  filters: { key: FilterKey; label: string; options: FilterOption[] }[];
  count: number; total: number; wagons?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  const active = filters.some(f => search.get(f.key));
  function update(key?: FilterKey, value?: string) {
    const params = new URLSearchParams(search.toString());
    if (key) { if (value) params.set(key, value); else params.delete(key); }
    else for (const filter of filters) params.delete(filter.key);
    startTransition(() => router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false }));
  }
  return (
    <section aria-label="Filtry sbírky" aria-busy={pending} className="mb-5 flex flex-wrap items-end gap-3 border-b border-divider pb-4">
      {filters.map(filter => {
        const value = search.get(filter.key) || "";
        return <label key={filter.key} className="flex min-w-36 max-w-full flex-1 flex-col gap-1 text-xs text-secondary sm:flex-none">
          {filter.label}
          <select value={value} disabled={pending} onChange={e => update(filter.key, e.target.value)} className="w-full min-w-32 sm:max-w-64">
            <option value="">Vše</option>
            {value && !filter.options.some(o => o.value === value) && <option value={value}>Nedostupná volba</option>}
            {filter.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>;
      })}
      {active && <button type="button" onClick={() => update()} disabled={pending} className="ui-button ui-button-quiet">Zrušit filtry</button>}
      <p role="status" className="w-full pb-2 text-xs tabular-nums text-secondary sm:ml-auto sm:w-auto">{count} / {total} {wagons ? "variant" : "lokomotiv"}</p>
    </section>
  );
}
