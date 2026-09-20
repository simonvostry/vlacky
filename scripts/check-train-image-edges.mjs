import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
const mapping = JSON.parse(await readFile('src/lib/enhanced-vehicle-images.json', 'utf8'));
function verticalBounds(data, info) {
  let top = info.height, bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * info.channels + info.channels - 1] > 10) {
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (bottom < top) throw new Error('Empty image');
  return {top,bottom};
}
for (const [source, target] of Object.entries(mapping)) {
  const original = await sharp(`public${source}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = await sharp(`public${target}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== original.info.width * 4 || info.height !== original.info.height * 4) throw new Error(`${source}: incorrect 4x dimensions`);
  const expected = verticalBounds(original.data, original.info);
  const actual = verticalBounds(data, info);
  if (Math.abs(actual.top - expected.top * 4) > 1 || Math.abs(actual.bottom - ((expected.bottom + 1) * 4 - 1)) > 1) {
    throw new Error(`${source}: changed vertical bounds ${actual.top}/${actual.bottom}, expected ${expected.top*4}/${(expected.bottom+1)*4-1}`);
  }
  const columns = new Uint32Array(info.width);
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * info.channels + info.channels - 1] > 10) columns[x]++;
  }
  const left = columns.findIndex(n => n > 0);
  let right = columns.length - 1;
  while (right >= 0 && columns[right] === 0) right--;
  // One export pixel = 0.25 CSS pixels at native display scale.
  if (left > 1 || info.width - 1 - right > 1) throw new Error(`${source}: side padding ${left}/${info.width - 1 - right}px`);
}
console.log(`Verified ${Object.keys(mapping).length} vehicle images: exact 4x canvas, original vertical bounds, no side padding beyond one export pixel.`);
