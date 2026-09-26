/** Stable grouping, never inferred from a mutable image URL at render time. */
export function groupVehicles<T extends { id: number; type: string; wagonVariantId?: number | null }>(vehicles: T[]) {
  const groups = new Map<string, T[]>();
  for (const vehicle of vehicles) {
    const key = vehicle.type === 'wagon' && vehicle.wagonVariantId != null ? `variant:${vehicle.wagonVariantId}` : `vehicle:${vehicle.id}`;
    const members = groups.get(key) ?? [];
    members.push(vehicle);
    groups.set(key, members);
  }
  return [...groups.entries()].map(([key, pieces]) => ({ key, vehicle: pieces[0], pieces }));
}
export function equipmentLabel(value: boolean | null) { return value ? 'Ano' : 'Ne'; }
