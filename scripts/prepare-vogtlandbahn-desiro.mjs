import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';

const reference = 'public/img/catalog/642-duk-a.gif';
const master = 'output/desiro-742004/vogtlandbahn-642-master.png';
const source = '/img/catalog/642-vogtlandbahn-ai.png';
const target = '/img/enhanced/642-vogtlandbahn-ai-4x.webp';
async function bounds(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 10) {
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (right < left) throw new Error(`Empty image: ${file}`);
  return { left, top, width: right - left + 1, height: bottom - top + 1, canvasWidth: info.width, canvasHeight: info.height };
}
const original = await bounds(reference);
const art = await bounds(master);
const crop = { left: art.left, top: art.top, width: art.width, height: art.height };
for (const scale of [1, 4]) {
  const rendered = sharp(master).extract(crop)
    .resize(original.canvasWidth * scale, original.height * scale, { fit: 'fill' })
    .extend({ top: original.top * scale, bottom: (original.canvasHeight - original.top - original.height) * scale, left: 0, right: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (scale === 1) await rendered.png().toFile(`public${source}`);
  else await rendered.webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(`public${target}`);
}
const mappingPath = 'src/lib/enhanced-vehicle-images.json';
const mapping = JSON.parse(await readFile(mappingPath, 'utf8'));
mapping[source] = target;
await writeFile(mappingPath, JSON.stringify(mapping, null, 2) + '\n');
console.log(JSON.stringify({ source, target, width: original.canvasWidth, height: original.canvasHeight }));
