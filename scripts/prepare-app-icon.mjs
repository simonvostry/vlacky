import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const master = 'output/brejlovec-icon/brejle-transparent-v2.png';
const render = size => sharp(master).resize(size, size).ensureAlpha().png().toBuffer();

// Next.js discovers these file-based icons and emits the appropriate metadata.
await writeFile('src/app/icon.png', await render(512));
await writeFile('src/app/apple-icon.png', await render(180));

// Embed multiple real resolutions so browser tabs and desktop shortcuts stay crisp.
const sizes = [16, 32, 48, 64, 128, 256];
const images = await Promise.all(sizes.map(render));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (let i = 0; i < sizes.length; i++) {
  const entry = 6 + 16 * i;
  header[entry] = header[entry + 1] = sizes[i] === 256 ? 0 : sizes[i];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[i].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += images[i].length;
}
await writeFile('src/app/favicon.ico', Buffer.concat([header, ...images]));
await writeFile('output/brejlovec-icon/preview-32.png', images[1]);
await writeFile('output/brejlovec-icon/preview-16.png', images[0]);
console.log('Created app icon (512px), Apple icon (180px), and favicon (16–256px).');
