// Refresh owned double-deck liveries without replacing shared catalog originals.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
const exports = [];
for (const key of ['107', '108']) {
const master = `output/wagon-${key}/master.png`;
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
// Preserve the existing 268 px catalog length; resize proportionally by width only.
const width = 268;
const native = await sharp(master).extract(crop).resize({ width }).png().toBuffer();
const large = await sharp(master).extract(crop).resize({ width: width * 4 }).png().toBuffer();
const nativeMeta = await sharp(native).metadata();
const largeMeta = await sharp(large).metadata();
const height = Math.max(nativeMeta.height, Math.ceil(largeMeta.height / 4));
const padding = height * 4 - largeMeta.height;
const largeTop = padding === 2 ? 1 : 0;
const source = `/img/owned/doubledeck-${key}-v1.png`;
const enhanced = `/img/enhanced/doubledeck-${key}-v1-4x.webp`;
const zoom = `/img/zoom/doubledeck-${key}-v1.webp`;
// Downsample the same padded lossless preview so subpixel edge rounding agrees.
const paddedPreview = await sharp(large).extend({ top: largeTop, bottom: padding - largeTop, left: 0, right: 0, background: '#00000000' }).png().toBuffer();
await sharp(paddedPreview).resize({ width }).png().toFile(`public${source}`);
await sharp(large).extend({ top: largeTop, bottom: padding - largeTop, left: 0, right: 0, background: '#00000000' }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(`public${enhanced}`);
// Match the preview geometry with transparent rounding space; never enlarge the master artwork.
const zoomHeight = Math.ceil(crop.width * height / width);
const zoomPadding = Math.max(0, zoomHeight - crop.height);
await sharp(master).extract(crop).extend({ top: 0, bottom: zoomPadding, left: 0, right: 0, background: '#00000000' }).webp({ quality: 94, alphaQuality: 100, effort: 6 }).toFile(`public${zoom}`);
const mappingPath = 'src/lib/enhanced-vehicle-images.json';
const mapping = JSON.parse(await readFile(mappingPath, 'utf8'));
mapping[source] = enhanced;
await writeFile(mappingPath, JSON.stringify(mapping, null, 2) + '\n');
const zoomPath = 'src/lib/zoom-vehicle-images.json';
const zoomMapping = JSON.parse(await readFile(zoomPath, 'utf8'));
zoomMapping[source] = { src: zoom, width: crop.width, height: crop.height + zoomPadding };
await writeFile(zoomPath, JSON.stringify(zoomMapping, null, 2) + '\n');
exports.push({ key, source, enhanced, zoom, width, height, crop });
console.log({ source, width, height, zoomWidth: crop.width, zoomHeight: crop.height + zoomPadding });
}
await writeFile('output/wagon-107/exports.json', JSON.stringify(exports, null, 2) + '\n');
