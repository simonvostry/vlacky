// Enhance catalog #1785 without changing its original, identity or native dimensions.
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const master = 'output/catalog-1785/master.png';
const source = '/img/catalog/1216-n2-a.gif';
const preview = '/img/enhanced/cd-1216-n2-4x-v1.webp';
const zoom = '/img/zoom/cd-1216-n2-v1.webp';
async function bounds(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1, transparent = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const alpha = data[(y * info.width + x) * info.channels + info.channels - 1];
    if (alpha === 0) transparent++;
    if (alpha > 10) {
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (right < left || transparent < info.width * info.height * .05) throw new Error(`Invalid cutout: ${file}`);
  return { left, top, width: right - left + 1, height: bottom - top + 1, canvasWidth: info.width, canvasHeight: info.height };
}
const original = await bounds(`public${source}`);
const art = await bounds(master);
const crop = { left: art.left, top: art.top, width: art.width, height: art.height };
// Same normalization as prepare-train-images: preserve native visible height and
// transparent vertical margins, with couplers tight at both horizontal ends.
async function render(scale, target, quality) {
  const width = Math.floor(original.canvasWidth * scale);
  const height = Math.floor(original.canvasHeight * scale);
  const artHeight = Math.floor(original.height * scale);
  const top = Math.floor(original.top * scale);
  await sharp(master).extract(crop).resize(width, artHeight, { fit: 'fill', withoutEnlargement: true })
    .extend({ left: 0, right: 0, top, bottom: height - top - artHeight, background: '#00000000' })
    .webp({ quality, alphaQuality: 100, effort: 6 }).toFile(`public${target}`);
  return { width, height };
}
await mkdir('public/img/enhanced', { recursive: true });
await mkdir('public/img/zoom', { recursive: true });
if (art.width < original.canvasWidth * 4 || art.height < original.height * 4) throw new Error('Master too small for 4× export');
const previewSize = await render(4, preview, 85);
const zoomSize = await render(Math.min(art.width / original.canvasWidth, art.height / original.height), zoom, 92);
for (const [file, value] of [
  ['src/lib/enhanced-vehicle-images.json', preview],
  ['src/lib/zoom-vehicle-images.json', { src: zoom, ...zoomSize }],
]) {
  const mapping = JSON.parse(await readFile(file, 'utf8'));
  mapping[source] = value;
  await writeFile(file, JSON.stringify(mapping, null, 2) + '\n');
}
const report = { source, master, crop, preview, previewSize, zoom, zoomSize };
await writeFile('output/catalog-1785/export-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(report);
