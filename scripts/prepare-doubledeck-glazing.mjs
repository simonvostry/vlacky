// Refresh glazing on owned double-deck liveries; preserve catalog originals.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
const exports = [];
for (const key of ['107', '108']) {
const master = `output/doubledeck-glazing/${key}-master.png`;
const { data, info } = await sharp(master).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width, top = info.height, right = -1, bottom = -1;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  if (data[(y * info.width + x) * info.channels + info.channels - 1] > 10) {
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
}
if (right < left) throw new Error('Empty master');
const crop = { left, top, width: right - left + 1, height: bottom - top + 1 };
// Preserve the existing 268 px length and approved native canvas.
const width = 268;
// Retain the approved native canvas; round the subpixel reconstruction to it.
const height = key === '107' ? 47 : 48;
const large = await sharp(master).extract(crop).resize(width * 4, height * 4, { fit: 'fill' }).png().toBuffer();
const source = `/img/owned/doubledeck-${key}-v2.png`;
const enhanced = `/img/enhanced/doubledeck-${key}-v2-4x.webp`;
const zoom = `/img/zoom/doubledeck-${key}-v2.webp`;
// Downsample the same lossless preview so the silhouette and edge rounding agree.
await sharp(large).resize({ width }).png().toFile(`public${source}`);
await sharp(large).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(`public${enhanced}`);
// Match the preview geometry without enlarging the master artwork.
const zoomHeight = Math.round(crop.width * height / width);
await sharp(master).extract(crop).resize(crop.width, zoomHeight, { fit: 'fill' }).webp({ quality: 94, alphaQuality: 100, effort: 6 }).toFile(`public${zoom}`);
const mappingPath = 'src/lib/enhanced-vehicle-images.json';
const mapping = JSON.parse(await readFile(mappingPath, 'utf8'));
mapping[source] = enhanced;
await writeFile(mappingPath, JSON.stringify(mapping, null, 2) + '\n');
const zoomPath = 'src/lib/zoom-vehicle-images.json';
const zoomMapping = JSON.parse(await readFile(zoomPath, 'utf8'));
zoomMapping[source] = { src: zoom, width: crop.width, height: zoomHeight };
await writeFile(zoomPath, JSON.stringify(zoomMapping, null, 2) + '\n');
exports.push({ key, source, enhanced, zoom, width, height, crop });
console.log({ source, width, height, zoomWidth: crop.width, zoomHeight });
}
await writeFile('output/doubledeck-glazing/exports.json', JSON.stringify(exports, null, 2) + '\n');
