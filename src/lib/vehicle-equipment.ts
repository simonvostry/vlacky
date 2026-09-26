/** Equipment belongs to a physical piece, never its shared artwork/variant. */
export const wagonEquipmentFields = [
  ['magneticCouplerA', 'Magnetické spřáhlo – konec A'],
  ['magneticCouplerB', 'Magnetické spřáhlo – konec B'],
  ['hasTailLights', 'Červená koncová světla'],
  ['hasSoundDecoder', 'Zvukový dekodér'],
  ['hasSpeaker', 'Vestavěný reproduktor'],
] as const;
export const equipmentFields = [...wagonEquipmentFields, ['isWeathered', 'Patinováno']] as const;
export type VehicleEquipment = Record<typeof equipmentFields[number][0], boolean>;

/** One user-facing sound feature, preserving both older inventory fields. */
export function hasVehicleSound(value: Partial<VehicleEquipment>) {
  return Boolean(value.hasSoundDecoder || value.hasSpeaker);
}
export function soundEquipmentPatch(enabled: boolean, previous: Partial<VehicleEquipment>) {
  if (!enabled) return { hasSoundDecoder: false, hasSpeaker: false };
  // Retain old distinctions when already equipped. A newly marked sound wagon
  // needs a speaker; do not invent an installed decoder or DCC configuration.
  return { hasSoundDecoder: Boolean(previous.hasSoundDecoder), hasSpeaker: Boolean(previous.hasSpeaker || !previous.hasSoundDecoder) };
}
export type EquipmentSymbol = 'coupler' | 'tail' | 'sound' | 'weather' | 'lights';
export type EquipmentIndicator = { key: EquipmentSymbol; label: string; active: boolean; badge?: string };
export function equipmentIndicators(value: Partial<VehicleEquipment> & { hasLights?: boolean | null }, wagon = true): EquipmentIndicator[] {
  const a = Boolean(value.magneticCouplerA), b = Boolean(value.magneticCouplerB);
  const result: EquipmentIndicator[] = wagon ? [
    { key: 'coupler', label: `Magnetická spřáhla: ${a && b ? 'oba konce' : a ? 'konec A' : b ? 'konec B' : 'Ne'}`, active: a || b, badge: a && b ? '2' : a ? 'A' : b ? 'B' : undefined },
    { key: 'tail', label: `Červená koncová světla: ${value.hasTailLights ? 'Ano' : 'Ne'}`, active: Boolean(value.hasTailLights) },
    { key: 'sound', label: `Zvuk: ${hasVehicleSound(value) ? 'Ano' : 'Ne'}`, active: hasVehicleSound(value) },
  ] : [];
  result.push({ key: 'weather', label: `Patinováno: ${value.isWeathered ? 'Ano' : 'Ne'}`, active: Boolean(value.isWeathered) });
  if (wagon) result.push({ key: 'lights', label: `Osvětlení: ${value.hasLights ? 'Ano' : 'Ne'}`, active: Boolean(value.hasLights) });
  return result;
}
