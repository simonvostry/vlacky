// Side-elevation export at the shared freight scale: 10 native pixels / prototype metre.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
const master = 'output/freight-sggmrrs/master-v3.png';
const prototypeLengthMm = 29610;
const nativeWidth = Math.round(prototypeLengthMm / 1000 * 10);
const source = '/img/catalog/cdc-sggmrrs-90-gigawood.png';
const enhanced = '/img/enhanced/cdc-sggmrrs-90-gigawood-4x.webp';
const { data, info } = await sharp(master).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width, top = info.height, right = -1, bottom = -1;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  if (data[(y * info.width + x) * info.channels + info.channels - 1] > 10) {
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
}
if (right < left) throw new Error('Empty master');
const crop = { left, top, width: right - left + 1, height: bottom - top + 1 };
// Width-only resize retains proportions; never force a common wagon width or height.
await sharp(master).extract(crop).resize({ width: nativeWidth }).png().toFile(`public${source}`);
await sharp(master).extract(crop).resize({ width: nativeWidth * 4 }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(`public${enhanced}`);
const original = await sharp(`public${source}`).metadata();
const derivative = await sharp(`public${enhanced}`).metadata();
if (derivative.height !== original.height * 4) throw new Error('Review proportional rounding before publishing');
const mappingPath = 'src/lib/enhanced-vehicle-images.json';
const mapping = JSON.parse(await readFile(mappingPath, 'utf8'));
mapping[source] = enhanced;
await writeFile(mappingPath, JSON.stringify(mapping, null, 2) + '\n');
console.log({ source, enhanced, prototypeLengthMm, nativeWidth, nativeHeight: original.height });
