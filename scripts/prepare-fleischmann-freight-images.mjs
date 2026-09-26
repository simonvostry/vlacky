// Built-in imagegen masters stay private in output/. Width-only exports use 10 px/m.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';

const wagons = [
  { sku: '6260066', slug: 'db-ddm-blue', modelLengthMm: 165 }, // 330 mm two-wagon set
  { sku: '6660081', slug: 'db-zags-orange-stripe', modelLengthMm: 110 },
  { sku: '6660069', slug: 'aae-sdggmrs-t2000-dhl', modelLengthMm: 214 },
];
const mappingPath = 'src/lib/enhanced-vehicle-images.json';
const mapping = JSON.parse(await readFile(mappingPath, 'utf8'));
const exported = [];
for (const wagon of wagons) {
  const master = `output/freight-fleischmann/${wagon.sku}/master.png`;
  const { data, info } = await sharp(master).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * info.channels + info.channels - 1] > 10) {
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (right < left) throw new Error(`Empty master: ${master}`);
  const crop = { left, top, width: right - left + 1, height: bottom - top + 1 };
  const width = Math.round(wagon.modelLengthMm * 160 / 1000 * 10);
  const native = await sharp(master).extract(crop).resize({ width }).png().toBuffer();
  const large = await sharp(master).extract(crop).resize({ width: width * 4 }).png().toBuffer();
  const nativeMeta = await sharp(native).metadata();
  const largeMeta = await sharp(large).metadata();
  // Integer rounding can differ by a pixel. Add transparent canvas, never stretch artwork.
  const height = Math.max(nativeMeta.height, Math.ceil(largeMeta.height / 4));
  const source = `/img/catalog/${wagon.slug}.png`;
  const enhanced = `/img/enhanced/${wagon.slug}-4x.webp`;
  await sharp(native).extend({ top: 0, left: 0, right: 0, bottom: height - nativeMeta.height, background: '#00000000' }).png().toFile(`public${source}`);
  await sharp(large).extend({ top: 0, left: 0, right: 0, bottom: height * 4 - largeMeta.height, background: '#00000000' }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(`public${enhanced}`);
  mapping[source] = enhanced;
  exported.push({ ...wagon, source, enhanced, width, height, crop });
}
await writeFile(mappingPath, JSON.stringify(mapping, null, 2) + '\n');
await writeFile('output/freight-fleischmann/exports.json', JSON.stringify(exported, null, 2) + '\n');
console.log(exported);
