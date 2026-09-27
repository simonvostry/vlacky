/** NEM 800 epoch identifiers. Dates are country-specific, not universal cutoffs. */
export const EPOCHS = [1, 2, 3, 4, 5, 6] as const;
export const epochLabels: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI' };
export function epochLabel(epochs: readonly number[] = []) {
  return epochs.length ? epochs.map(value => epochLabels[value]).join(' / ') : 'Nevyplněna';
}
export function readEpochs(value: unknown): number[] {
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { return []; } }
  return Array.isArray(value) ? [...new Set(value.filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 6))].sort((a,b) => a-b) : [];
}
