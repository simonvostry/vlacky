/** Model makers only; prototype builders and decoder manufacturers are separate. */
export const modelManufacturers: Record<string, { name: string; src: string; width: number; height: number; darkBacking?: boolean }> = {
  fleischmann: { name: 'Fleischmann', src: '/img/manufacturer-fleischmann.svg', width: 6486, height: 964 },
  minitrix: { name: 'Minitrix', src: '/img/manufacturer-minitrix.svg', width: 293.87, height: 46.41 },
  'ree models': { name: 'REE Models', src: '/img/manufacturer-ree-modeles.svg', width: 83.3, height: 76.8 },
  sudexpress: { name: 'Sudexpress', src: '/img/manufacturer-sudexpress.png', width: 220, height: 50, darkBacking: true },
};

export function manufacturerKey(name: string) {
  const key = name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
  return key === 'ree modeles' ? 'ree models' : key === 'sud express' ? 'sudexpress' : key;
}

export function manufacturerName(name: string) {
  return modelManufacturer(name)?.name ?? name.trim();
}

export function modelManufacturer(name: string) {
  const key = manufacturerKey(name);
  return Object.hasOwn(modelManufacturers, key) ? modelManufacturers[key] : undefined;
}

export function manufacturerOptions(names: (string | null)[]) {
  const options = new Map(Object.entries(modelManufacturers).map(([key, value]) => [key, value.name]));
  for (const name of names) if (name?.trim() && !options.has(manufacturerKey(name))) options.set(manufacturerKey(name), name.trim());
  return [...options.values()].sort((a, b) => a.localeCompare(b, 'cs'));
}
