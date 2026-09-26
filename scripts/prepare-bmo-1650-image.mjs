// Shared catalog enhancement; keep the original and its native dimensions intact.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
const master = 'output/catalog-1650/master.png';
const source = '/img/catalog/bmto-m-a.gif';
const enhanced = '/img/enhanced/cd-bmo-1650-4x.webp';
const zoom = '/img/zoom/cd-bmo-1650.webp';
const { data, info } = await sharp(master).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width, top = info.height, right = -1, bottom = -1;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  if (data[(y * info.width + x) * 4 + 3] > 10) {
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
}
if (right < left) throw new Error('Empty master');
const crop = { left, top, width: right-left+1, height: bottom-top+1 };
const original = await sharp('public' + source).metadata();
// Width-only sizing; a transparent rounding row restores the existing 268 × 46 canvas.
const preview = await sharp(master).extract(crop).resize({ width: original.width * 4 }).png().toBuffer();
const meta = await sharp(preview).metadata();
const padding = original.height * 4 - meta.height;
if (padding < 0 || padding > 3) throw new Error('Master proportions do not match the catalog');
await sharp(preview).extend({ top: 0, bottom: padding, left: 0, right: 0, background: '#00000000' })
  .webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile('public' + enhanced);
const zoomHeight = Math.ceil(crop.width * original.height / original.width);
await sharp(master).extract(crop).extend({ top: 0, bottom: zoomHeight-crop.height, left: 0, right: 0, background: '#00000000' })
  .webp({ quality: 94, alphaQuality: 100, effort: 6 }).toFile('public' + zoom);
for (const [file, value] of [
  ['src/lib/enhanced-vehicle-images.json', enhanced],
  ['src/lib/zoom-vehicle-images.json', { src: zoom, width: crop.width, height: zoomHeight }],
]) {
  const mapping = JSON.parse(await readFile(file, 'utf8'));
  mapping[source] = value;
  await writeFile(file, JSON.stringify(mapping, null, 2) + '\n');
}
console.log({ source, enhanced, zoom, width: original.width, height: original.height, crop });
