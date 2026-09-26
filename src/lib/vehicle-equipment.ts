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
export function installedEquipment(value: Partial<VehicleEquipment>) {
  return equipmentFields.filter(([key]) => value[key]).map(([,label]) => label);
}
