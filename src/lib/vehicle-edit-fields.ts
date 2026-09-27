/** Shared by editor payloads and server validation. No database/browser dependencies. */
export type WagonEditMode = 'model' | 'piece';
export const wagonModelFields = [
  'designation', 'operator', 'type', 'wagonKind', 'classType', 'imagePath', 'imageWidth', 'imageHeight',
  'manufacturer', 'catalogNumber', 'catalogId', 'catalogImageId', 'lengthOverBuffersMm', 'epochs', 'epochNotes',
] as const;
export const vehiclePieceFields = [
  'dccAddress', 'runningNumber', 'notes', 'isTemplate', 'magneticCouplerA', 'magneticCouplerB',
  'magneticCouplers', 'hasTailLights', 'hasLights', 'hasSoundDecoder', 'hasSpeaker', 'isWeathered',
] as const;
export function allowsVehicleEditField(mode: WagonEditMode, key: string): boolean {
  return (mode === 'model' ? wagonModelFields : vehiclePieceFields).some(field => field === key);
}
