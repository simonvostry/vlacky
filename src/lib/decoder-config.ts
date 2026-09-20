export type DecoderFunction = {
  functionNumber: number;
  label: string;
  category: "sound" | "light" | "other";
  behavior: "toggle" | "momentary";
  description: string;
};
export type CvRecord = { number: number; value: number; cv31: number | null; cv32: number | null; note: string };
export type DecoderConfig = {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  address: number | null;
  soundProject: string;
  manualUrl: string;
  notes: string;
  functions: DecoderFunction[];
  cvs: CvRecord[];
};
export type VehicleDccConfig = { dccAddress: number | null; decoders: DecoderConfig[] };
export const categoryLabels = { sound: "Zvuk", light: "Světla", other: "Ostatní" };
export function blankDecoder(): DecoderConfig {
  return { id: crypto.randomUUID(), name: "", manufacturer: "", model: "", address: null, soundProject: "", manualUrl: "", notes: "", functions: [], cvs: [] };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Neplatná konfigurace.");
  return value as Record<string, unknown>;
}
function str(value: unknown, max = 200, required = false): string {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new Error("Vyplňte textová pole a dodržte jejich maximální délku.");
  return value.trim();
}
function num(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) throw new Error(`Číslo musí být celé v rozsahu ${min}–${max}.`);
  return value;
}
function optionalNum(value: unknown, min: number, max: number) { return value === null ? null : num(value, min, max); }
function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(`Příliš mnoho položek (maximum ${max}).`);
  return value;
}
export function parseDccAddress(value: unknown) { return optionalNum(value, 1, 10239); }
export function parseDccConfig(value: unknown): VehicleDccConfig {
  const body = object(value);
  const ids = new Set<string>();
  return {
    dccAddress: optionalNum(body.dccAddress, 1, 10239),
    decoders: list(body.decoders, 12).map(item => {
      const d = object(item);
      const id = str(d.id, 80, true);
      if (!/^[a-zA-Z0-9-]+$/.test(id) || ids.has(id)) throw new Error("Neplatné nebo duplicitní ID dekodéru.");
      ids.add(id);
      const manualUrl = str(d.manualUrl, 2000);
      if (manualUrl) {
        let url: URL;
        try { url = new URL(manualUrl); } catch { throw new Error("Manuál musí mít platnou HTTP nebo HTTPS adresu."); }
        if (!["http:", "https:"].includes(url.protocol)) throw new Error("Manuál musí mít HTTP nebo HTTPS adresu.");
      }
      const functionNumbers = new Set<number>();
      const cvKeys = new Set<string>();
      return {
        id, name: str(d.name, 100, true), manufacturer: str(d.manufacturer), model: str(d.model),
        address: optionalNum(d.address, 1, 10239), soundProject: str(d.soundProject, 500), manualUrl, notes: str(d.notes, 4000),
        functions: list(d.functions, 129).map((item): DecoderFunction => {
          const f = object(item);
          const functionNumber = num(f.functionNumber, 0, 128);
          if (functionNumbers.has(functionNumber)) throw new Error(`F${functionNumber} je v dekodéru uvedena vícekrát.`);
          functionNumbers.add(functionNumber);
          if (f.category !== "sound" && f.category !== "light" && f.category !== "other") throw new Error("Neplatná kategorie funkce.");
          if (f.behavior !== "toggle" && f.behavior !== "momentary") throw new Error("Neplatný režim funkce.");
          return { functionNumber, label: str(f.label, 150, true), category: f.category, behavior: f.behavior, description: str(f.description, 1000) };
        }).sort((a, b) => a.functionNumber - b.functionNumber),
        cvs: list(d.cvs, 1024).map(item => {
          const c = object(item);
          const number = num(c.number, 1, 1024);
          const cv31 = optionalNum(c.cv31, 0, 255), cv32 = optionalNum(c.cv32, 0, 255);
          if ((cv31 === null) !== (cv32 === null)) throw new Error("U indexovaného CV vyplňte CV31 i CV32.");
          const key = `${number}:${cv31}:${cv32}`;
          if (cvKeys.has(key)) throw new Error(`CV${number} se stejným indexem je uvedeno vícekrát.`);
          cvKeys.add(key);
          return { number, value: num(c.value, 0, 255), cv31, cv32, note: str(c.note, 1000) };
        }),
      };
    }),
  };
}
