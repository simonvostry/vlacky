// Package the approved side-elevation master; never stretch it to coach dimensions.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
const master = 'output/freight-uacs/uacs-csd-side-v2.png';
const { data, info } = await sharp(master).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width, top = info.height, right = -1, bottom = -1;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  if (data[(y * info.width + x) * info.channels + info.channels - 1] > 10) {
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
}
if (right < left) throw new Error('Empty approved master');
const crop = { left, top, width: right - left + 1, height: bottom - top + 1 };
const source = '/img/catalog/csd-uacs-raj-yellow-brown.png';
const enhanced = '/img/enhanced/csd-uacs-raj-yellow-brown-4x.webp';
// A short silo wagon, approximately 14.5 m long, uses 145 native display pixels.
// Width-only resizing preserves the approved drawing's aspect ratio.
await sharp(master).extract(crop).resize({ width: 145 }).png().toFile(`public${source}`);
await sharp(master).extract(crop).resize({ width: 580 }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(`public${enhanced}`);
const mappingPath = 'src/lib/enhanced-vehicle-images.json';
const mapping = JSON.parse(await readFile(mappingPath, 'utf8'));
mapping[source] = enhanced;
await writeFile(mappingPath, JSON.stringify(mapping, null, 2) + '\n');
console.log({ source, enhanced, original: await sharp(`public${source}`).metadata(), derivative: await sharp(`public${enhanced}`).metadata() });
