export type TrafficKind = "passenger" | "freight";

export function isTrafficKind(value: unknown): value is TrafficKind {
  return value === "passenger" || value === "freight";
}

export function vehicleSection(vehicle: { type: string; wagonKind?: string }) {
  return vehicle.type === "loco" ? "lokomotivy" : vehicle.wagonKind === "freight" ? "nakladni-vozy" : "vozy";
}
