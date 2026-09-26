/** Only these list routes persist filters. Detail/edit URLs never overwrite them. */
export const COLLECTION_FILTER_ROUTES = ["/lokomotivy", "/vozy", "/nakladni-vozy", "/katalog"] as const;
export const COLLECTION_FILTER_STORAGE_KEY = "vlacky-collection-filters-v1";
export const FILTER_STATE_MARKER = "filtry";
const commonKeys = ["op", "rada", "pohon", "skupina"];
export function isFilterCollection(path: string): boolean {
  return (COLLECTION_FILTER_ROUTES as readonly string[]).includes(path);
}
export function filterMemoryKeys(path: string): string[] {
  return path === "/katalog" ? [...commonKeys, "typ", "barvy"] : commonKeys;
}
/** Whitelist query values, not arbitrary URLs, so storage can never redirect elsewhere. */
export function rememberedFilterQuery(path: string, query: string): string {
  if (!isFilterCollection(path)) return "";
  const input = new URLSearchParams(query);
  const output = new URLSearchParams();
  for (const key of filterMemoryKeys(path)) {
    const value = input.get(key);
    if (value && value.length <= 200) output.set(key, value);
  }
  return output.toString();
}
export function hasExplicitFilters(path: string, query: string): boolean {
  const params = new URLSearchParams(query);
  return params.has(FILTER_STATE_MARKER) || filterMemoryKeys(path).some(key => params.has(key));
}
export function filterMemoryHref(path: string, query: string): string {
  const params = new URLSearchParams(rememberedFilterQuery(path, query));
  params.set(FILTER_STATE_MARKER, "1");
  return `${path}?${params}`;
}
export function resetFilterQuery(path: string, query: string): string {
  const params = new URLSearchParams(query);
  // Color variants are a display preference; all record filters, including category, reset.
  for (const key of filterMemoryKeys(path)) if (key !== "barvy") params.delete(key);
  params.set(FILTER_STATE_MARKER, "1");
  return params.toString();
}
