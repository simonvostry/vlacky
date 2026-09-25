// Export reviewed masters using the shared 4x canvas/visible-height contract.
import sharp from 'sharp';
import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
const root = 'output/train-250-1992';
const { vehicles } = JSON.parse(await readFile('src/db/data/ex250-1992.json', 'utf8'));
const mappingPath = 'src/lib/enhanced-vehicle-images.json';
const mapping = JSON.parse(await readFile(mappingPath, 'utf8'));
await mkdir('public/img/enhanced', { recursive: true });
const report = [];
async function bounds(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1, transparent = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const alpha = data[(y * info.width + x) * info.channels + info.channels - 1];
    if (!alpha) transparent++;
    if (alpha > 10) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
  }
  if (right < left || transparent < info.width * info.height * .05) throw new Error(`Invalid cutout: ${file}`);
  return { left, top, width: right - left + 1, height: bottom - top + 1, canvasWidth: info.width, canvasHeight: info.height };
}
for (const item of vehicles) {
  const source = `${root}/originals/${item.key}.gif`;
  const destination = `public${item.imagePath}`;
  const originalBytes = await readFile(source);
  const existing = await readFile(destination).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
  if (existing && !existing.equals(originalBytes)) throw new Error(`Refusing to replace a different source: ${destination}`);
  if (!existing) await copyFile(source, destination);
  const original = await bounds(destination);
  if (original.canvasWidth !== item.width || original.canvasHeight !== item.height) throw new Error(`Source dimensions changed: ${item.key}`);
  const master = `${root}/masters/${item.key}.png`;
  const art = await bounds(master);
  const target = `/img/enhanced/${item.key}-ex250-4x.webp`;
  await sharp(master).extract({ left: art.left, top: art.top, width: art.width, height: art.height })
    .resize(item.width * 4, original.height * 4, { fit: 'fill' })
    .extend({ top: original.top * 4, bottom: (item.height - original.top - original.height) * 4, left: 0, right: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 85, alphaQuality: 100, effort: 6 }).toFile(`public${target}`);
  mapping[item.imagePath] = target;
  report.push({ source: item.imagePath, target, width: item.width * 4, height: item.height * 4 });
}
await writeFile(mappingPath, JSON.stringify(mapping, null, 2) + '\n');
await writeFile(`${root}/exports.json`, JSON.stringify(report, null, 2) + '\n');
console.log(`Prepared ${report.length} transparent 4x derivatives.`);
