/** Keep custom filter lists inside the visible viewport, including browser zoom. */
export function dropdownPosition(anchor: { left: number; top: number; bottom: number; width: number },
  viewport: { left: number; top: number; width: number; height: number; layoutHeight: number }, contentHeight = 640) {
  const margin = 12, gap = 6;
  const width = Math.min(Math.max(anchor.width, 248), Math.max(0, viewport.width - margin * 2));
  const left = Math.max(viewport.left + margin, Math.min(anchor.left, viewport.left + viewport.width - margin - width));
  const below = viewport.top + viewport.height - margin - anchor.bottom - gap;
  const above = anchor.top - gap - viewport.top - margin;
  if (below < Math.min(640, contentHeight) && above > below) {
    return { left, width, bottom: viewport.layoutHeight - anchor.top + gap, maxHeight: Math.max(0, Math.min(640, above)) };
  }
  return { left, width, top: Math.max(viewport.top + margin, anchor.bottom + gap), maxHeight: Math.max(0, Math.min(640, below)) };
}

const normalize = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("cs");
export function typeaheadIndex(labels: string[], query: string, current: number): number {
  const needle = normalize(query);
  const repeated = needle.length > 1 && [...needle].every(char => char === needle[0]);
  const prefix = repeated ? needle[0] : needle;
  // Repeated/single keys cycle; a growing prefix refines the current match.
  const start = prefix.length === 1 ? current + 1 : current;
  for (let step = 0; step < labels.length; step++) {
    const index = (start + step + labels.length) % labels.length;
    if (normalize(labels[index]).startsWith(prefix)) return index;
  }
  return current;
}
