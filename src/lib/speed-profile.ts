import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const parsed = new Date(`${v}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v;
}, "Neplatné datum měření.");
const speed = z.number().finite().min(0).max(10000).nullable();
export const speedProfileSchema = z.object({
  schemaVersion: z.literal(1),
  measuredOn: date.nullable(),
  measurementMode: z.enum(["single-direction", "both-directions", "unknown"]),
  primaryDirection: z.enum(["forward", "reverse"]),
  speedSteps: z.union([z.literal(14), z.literal(28), z.literal(126), z.literal(128)]),
  scaleRatio: z.number().finite().min(1).max(1000),
  unit: z.literal("km/h"),
  speedBasis: z.literal("prototype-equivalent"),
  notes: z.string().max(4000),
  source: z.object({
    application: z.string().max(100), version: z.string().max(100),
    locomotiveName: z.string().max(200), vehicleSourceId: z.string().max(100),
    importedAt: z.string().datetime({ offset: true }).nullable(),
    projectSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
    rawSpeedControlXml: z.string().max(100000),
    context: z.record(z.string(), z.json()),
  }).strict().nullable(),
  points: z.array(z.object({ step: z.number().int().min(0), forwardKmh: speed, reverseKmh: speed }).strict()).min(1).max(129),
}).strict().superRefine((p, ctx) => {
  const seen = new Set<number>();
  for (const point of p.points) {
    if (seen.has(point.step) || point.step > p.speedSteps || (point.forwardKmh === null && point.reverseKmh === null)) {
      ctx.addIssue({ code: "custom", message: "Každý krok musí být jedinečný, v rozsahu režimu a mít alespoň jednu rychlost." });
    }
    seen.add(point.step);
  }
  if (!p.points.some(v => p.primaryDirection === "forward" ? v.forwardKmh !== null : v.reverseKmh !== null)) {
    ctx.addIssue({ code: "custom", message: "Zvolený směr nemá žádné rychlosti." });
  }
});
export type SpeedProfile = z.infer<typeof speedProfileSchema>;
export type SavedSpeedProfile = { profile: SpeedProfile; updatedAt: string };
export function parseSpeedProfile(input: unknown): SpeedProfile {
  const p = speedProfileSchema.parse(input);
  return { ...p, points: [...p.points].sort((a, b) => a.step - b.step) };
}
export function identicalDirections(p: SpeedProfile) {
  return p.points.every(v => v.forwardKmh !== null && v.forwardKmh === v.reverseKmh);
}
export function profileWarnings(p: SpeedProfile) {
  const warnings: string[] = [];
  for (const field of ["forwardKmh", "reverseKmh"] as const) {
    const values = p.points.map(v => v[field]).filter((v): v is number => v !== null);
    if (values.some((v, i) => i > 0 && v < values[i - 1])) warnings.push(`Rychlost ${field === "forwardKmh" ? "vpřed" : "vzad"} v některém kroku klesá.`);
  }
  return warnings;
}
