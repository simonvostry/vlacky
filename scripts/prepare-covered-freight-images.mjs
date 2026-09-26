// Built-in imagegen masters stay private in output/. Width-only exports use 10 px/m.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';

const wagons = [
  {
    "sku": "15116-zssk",
    "master": "15116/zssk-master.png",
    "slug": "zssk-rilns-gray-minitrix",
    "prototypeLengthM": 19.9
  },
  {
    "sku": "15116-cdc",
    "master": "15116/cdc-master.png",
    "slug": "cdc-rilns-gray-minitrix",
    "prototypeLengthM": 19.9
  },
  {
    "sku": "15116-hz",
    "master": "15116/hz-master.png",
    "slug": "hz-rilns-red-minitrix",
    "prototypeLengthM": 19.9
  },
  {
    "sku": "837703",
    "master": "837703/master.png",
    "slug": "db-rils-red-cargo",
    "prototypeLengthM": 19.84
  },
  {
    "sku": "NW-089",
    "master": "NW-089/master.png",
    "slug": "aae-sdggmrs-schenker-trailers",
    "prototypeLengthM": 34.08
  },
  {
    "sku": "837715",
    "master": "837715/master.png",
    "slug": "cdc-rils-light-gray-script",
    "prototypeLengthM": 19.84
  },
  {
    "sku": "826251",
    "master": "826251/master.png",
    "slug": "cdc-hbbillns-silver",
    "prototypeLengthM": 15.52
  }
];
const mappingPath = 'src/lib/enhanced-vehicle-images.json';
const mapping = JSON.parse(await readFile(mappingPath, 'utf8'));
const exported = [];
for (const wagon of wagons) {
  const master = `output/freight-covered/${wagon.master}`;
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
  const width = Math.round(wagon.prototypeLengthM * 10);
  const native = await sharp(master).extract(crop).resize({ width }).png().toBuffer();
  const large = await sharp(master).extract(crop).resize({ width: width * 4 }).png().toBuffer();
  const nativeMeta = await sharp(native).metadata();
  const largeMeta = await sharp(large).metadata();
  // Integer rounding can differ by a pixel. Add transparent canvas, never stretch artwork.
  const height = Math.max(nativeMeta.height, Math.ceil(largeMeta.height / 4));
  const largePadding = height * 4 - largeMeta.height;
  // Split a two-row rounding remainder to align both alpha bounds within one pixel.
  const largeTop = largePadding === 2 ? 1 : 0;
  const source = `/img/catalog/${wagon.slug}.png`;
  const enhanced = `/img/enhanced/${wagon.slug}-4x.webp`;
  await sharp(native).extend({ top: 0, left: 0, right: 0, bottom: height - nativeMeta.height, background: '#00000000' }).png().toFile(`public${source}`);
  await sharp(large).extend({ top: largeTop, left: 0, right: 0, bottom: largePadding - largeTop, background: '#00000000' }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(`public${enhanced}`);
  mapping[source] = enhanced;
  exported.push({ ...wagon, source, enhanced, width, height, crop });
}
await writeFile(mappingPath, JSON.stringify(mapping, null, 2) + '\n');
await writeFile('output/freight-covered/exports.json', JSON.stringify(exported, null, 2) + '\n');
console.log(exported);
