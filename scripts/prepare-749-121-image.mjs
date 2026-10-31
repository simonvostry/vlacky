// Personal photo and generated master stay private in output/loco-749-121-0/.
// Export only this catalog livery, preserving the reconstructed proportions.
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const directory = 'output/loco-749-121-0';
const master = `${directory}/master.png`;
const { data, info } = await sharp(master).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width, top = info.height, right = -1, bottom = -1, transparent = 0;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  const alpha = data[(y * info.width + x) * info.channels + info.channels - 1];
  if (alpha === 0) transparent++;
  if (alpha > 10) {
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
}
if (right < left || transparent < info.width * info.height * 0.02) throw new Error('Master must be a transparent cutout');
const crop = { left, top, width: right - left + 1, height: bottom - top + 1 };
// Match the existing class 749 catalog display width. Height is derived from the
// photographed reconstruction; neither prototype nor model length is inferred.
const width = 164;
const native = await sharp(master).extract(crop).resize({ width }).png().toBuffer();
const preview = await sharp(master).extract(crop).resize({ width: width * 4 }).png().toBuffer();
const nativeMeta = await sharp(native).metadata();
const previewMeta = await sharp(preview).metadata();
const height = Math.max(nativeMeta.height, Math.ceil(previewMeta.height / 4));
const padding = height * 4 - previewMeta.height;
const previewTop = padding === 2 ? 1 : 0;
const source = '/img/catalog/cd-749-121-0-blue-red-yellow-v1.png';
const enhanced = '/img/enhanced/cd-749-121-0-blue-red-yellow-v1-4x.webp';
const zoom = '/img/zoom/cd-749-121-0-blue-red-yellow-v1.webp';
for (const folder of ['catalog', 'enhanced', 'zoom']) await mkdir(`public/img/${folder}`, { recursive: true });
await sharp(native).extend({ top: 0, bottom: height - nativeMeta.height, left: 0, right: 0, background: '#00000000' }).png().toFile(`public${source}`);
await sharp(preview).extend({ top: previewTop, bottom: padding - previewTop, left: 0, right: 0, background: '#00000000' }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(`public${enhanced}`);
// Keep the original master pixels, adding only transparent rounding space.
const zoomPadding = Math.max(0, Math.ceil(crop.width * height / width) - crop.height);
await sharp(master).extract(crop).extend({ top: 0, bottom: zoomPadding, left: 0, right: 0, background: '#00000000' }).webp({ quality: 94, alphaQuality: 100, effort: 6 }).toFile(`public${zoom}`);
const mappingPath = 'src/lib/enhanced-vehicle-images.json';
const mapping = JSON.parse(await readFile(mappingPath, 'utf8'));
mapping[source] = enhanced;
await writeFile(mappingPath, JSON.stringify(mapping, null, 2) + '\n');
const zoomPath = 'src/lib/zoom-vehicle-images.json';
const zoomMapping = JSON.parse(await readFile(zoomPath, 'utf8'));
zoomMapping[source] = { src: zoom, width: crop.width, height: crop.height + zoomPadding };
await writeFile(zoomPath, JSON.stringify(zoomMapping, null, 2) + '\n');
const manifest = { source, enhanced, zoom, width, height, crop, zoomWidth: crop.width, zoomHeight: crop.height + zoomPadding };
await writeFile(`${directory}/export.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log(manifest);
