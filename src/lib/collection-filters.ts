/** Read-only presentation facets. Never write inferred classifications to owned models. */
export const UNKNOWN = "nezarazeno";
export type FilterKey = "op" | "rada" | "pohon" | "skupina";
export type CollectionSearch = Partial<Record<FilterKey, string | string[]>>;
export type Facets = Record<FilterKey, string>;
export type FilterOption = { value: string; label: string };
type Vehicle = { designation: string; operator: string | null; type: string; catalogId?: number | null };
type Catalog = { id: number; designation: string; code: string | null; operator: string; wagonFamily: string };

export const tractionLabels: Record<string, string> = {
  electric: "Elektrické", diesel: "Dieselové", steam: "Parní", [UNKNOWN]: "Nezařazeno",
};
export const familyLabels: Record<string, string> = {
  y: "Y a příbuzné · 24,5 m", z: "Z a příbuzné · 26,4 m", doubledeck: "Patrové", [UNKNOWN]: "Nezařazeno",
};
const czechOperators = new Set(["ČD", "ČSD", "ČSD/ČD", "ČD Cargo", "RJ", "RegioJet", "ZSSK", "ZSSK Cargo"]);
// Explicit known classes, not guesses from the first digit of an international number.
// Sources and extension policy: docs/architecture.md#collection-filters.
const electricClasses = new Set(["193", "362", "363", "371", "388", "388.2"]);
const dieselClasses = new Set(["721", "751", "754", "T478.1", "T478.4"]);
const steamClasses = new Set(["498.0", "498.1"]);

export function vehicleClass(designation: string, locomotive = false): string {
  const normalized = designation.trim().replace(/\s+/g, " ");
  if (!locomotive) return normalized || UNKNOWN;
  // Full Czech vehicle numbers (754 061-0 / 754.061) belong to class 754.
  const modern = normalized.match(/^(\d{3})(?:[ .]\d{3}(?:-\d)?)(?:\s|$)/);
  if (modern && !/^[45]/.test(modern[1])) return modern[1];
  return normalized.replace(/^T\s+(?=\d)/, "T") || UNKNOWN;
}

export function traction(v: Vehicle): string {
  const row = vehicleClass(v.designation, true);
  if (row === "642" && (czechOperators.has(v.operator || "") || ["DB", "Vogtlandbahn", "DLB"].includes(v.operator || ""))) return "diesel";
  if (!czechOperators.has(v.operator || "")) return UNKNOWN;
  if (electricClasses.has(row)) return "electric";
  if (dieselClasses.has(row)) return "diesel";
  if (steamClasses.has(row)) return "steam";
  return UNKNOWN;
}

function sourceFamily(family: string): string | undefined {
  if (family === "CD_Y") return "y";
  if (family === "CD_Z" || family === "DLB_Z") return "z";
}

export function wagonFamily(v: Vehicle, catalog: Catalog[]): string {
  if (/^Bdmteeo(?:\s|$)/.test(v.designation) && ["ČD", "ČSD"].includes(v.operator || "")) return "doubledeck";
  const linked = catalog.find(c => c.id === v.catalogId);
  // Do not borrow a family from an incorrectly linked operator's reference.
  const compatible = (operator: string) => operator === v.operator || (operator === "ČSD/ČD" && ["ČD", "ČSD"].includes(v.operator || ""));
  if (linked && compatible(linked.operator)) {
    const family = sourceFamily(linked.wagonFamily);
    if (family) return family;
  }
  // Older owned entries point to yearly fleet lists rather than construction tables.
  // Resolve only unambiguous matching series; a shared letter such as Bmz is not
  // evidence for foreign operators or conflicting construction groups.
  if (!["ČD", "ČSD", "ČSD/ČD"].includes(v.operator || "")) return UNKNOWN;
  const designation = v.designation.trim();
  const matches = catalog.filter(c => c.operator === "ČD" && sourceFamily(c.wagonFamily) &&
    (c.code ? `${c.designation} ${c.code}` === designation || c.designation === designation : c.designation === designation));
  const families = new Set(matches.map(c => sourceFamily(c.wagonFamily)!));
  return families.size === 1 ? [...families][0] : UNKNOWN;
}

export function vehicleFacets(v: Vehicle, catalog: Catalog[] = []): Facets {
  return { op: v.operator?.trim() || UNKNOWN, rada: vehicleClass(v.designation, v.type === "loco"),
    pohon: v.type === "loco" ? traction(v) : UNKNOWN,
    skupina: v.type === "wagon" ? wagonFamily(v, catalog) : UNKNOWN };
}
export function selectedFilters(search: CollectionSearch): Facets {
  return Object.fromEntries((["op", "rada", "pohon", "skupina"] as const).map(key => [key, Array.isArray(search[key]) ? search[key][0] || "" : search[key] || ""])) as Facets;
}
export function matchesFilters(facets: Facets, selected: Facets, keys: FilterKey[]): boolean {
  return keys.every(key => !selected[key] || facets[key] === selected[key]);
}
export function facetOptions(facets: Facets[], key: FilterKey): FilterOption[] {
  const labels = key === "pohon" ? tractionLabels : key === "skupina" ? familyLabels : {};
  const values = new Set(facets.map(f => f[key]));
  // Keep all three requested traction choices discoverable, even with no owned steam engine.
  if (key === "pohon") for (const value of ["electric", "diesel", "steam"]) values.add(value);
  return [...values].sort((a,b) => a === UNKNOWN ? 1 : b === UNKNOWN ? -1 : a.localeCompare(b, "cs", { numeric: true }))
    .map(value => ({ value, label: value === UNKNOWN ? "Nezařazeno" : labels[value] || value }));
}
