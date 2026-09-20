import sharp from 'sharp';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
const root = 'output/train-image-enhancements';
const inventory = JSON.parse(await readFile(`${root}/inventory.json`, 'utf8'));
// Preserve separately generated variants, including the RegioJet Desiro.
const mapping = JSON.parse(await readFile('src/lib/enhanced-vehicle-images.json', 'utf8')), report = [];
await mkdir('public/img/enhanced', { recursive: true });
for (const item of inventory) {
  const name = item.path.split('/').pop().replace(/\.gif$/, '');
  const input = name === 'cd-193-vectron' ? 'output/image-upscale-samples/vectron-ai.png' : name === 'cd-bmee' ? 'output/image-upscale-samples/bmee-ai-transparent.png' : `${root}/${name}.png`;
  const original = await sharp(`public${item.path}`).metadata();
  const sourcePixels = await sharp(`public${item.path}`).ensureAlpha().raw().toBuffer();
  let sourceTop = original.height, sourceBottom = -1;
  for (let y = 0; y < original.height; y++) for (let x = 0; x < original.width; x++) {
    if (sourcePixels[(y * original.width + x) * 4 + 3] > 10) {
      sourceTop = Math.min(sourceTop, y);
      sourceBottom = Math.max(sourceBottom, y);
    }
  }
  if (sourceBottom < sourceTop) throw new Error(`Empty source: ${item.path}`);
  const sourceHeight = sourceBottom - sourceTop + 1;
  const meta = await sharp(input).metadata();
  if (!meta.hasAlpha) throw new Error(`Missing transparency: ${input}`);
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1, transparent = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const a = data[(y * info.width + x) * info.channels + info.channels - 1];
    if (a === 0) transparent++;
    if (a > 10) { left = Math.min(left,x); top = Math.min(top,y); right = Math.max(right,x); bottom = Math.max(bottom,y); }
  }
  if (right < left || transparent < info.width * info.height * .05) throw new Error(`Invalid cutout: ${input}`);
  const target = `/img/enhanced/${name}-4x-v3.webp`;
  // Fit the artwork to the ORIGINAL visible height, not the entire canvas.
  // Restore original top/bottom transparency to preserve roof and rail alignment.
  // Horizontal ends remain tight for coupler-to-coupler train compositions.
  await sharp(input).extract({left,top,width:right-left+1,height:bottom-top+1})
    .resize(original.width*4,sourceHeight*4,{fit:'fill'})
    .extend({top:sourceTop*4,bottom:(original.height-1-sourceBottom)*4,left:0,right:0,background:{r:0,g:0,b:0,alpha:0}})
    .webp({quality:85,alphaQuality:100,effort:6}).toFile(`public${target}`);
  mapping[item.path] = target;
  report.push({source:item.path,target,width:original.width*4,height:original.height*4,sourceTop,sourceBottom,visibleHeight:sourceHeight,bytes:(await stat(`public${target}`)).size});
}
await writeFile('src/lib/enhanced-vehicle-images.json',JSON.stringify(mapping,null,2)+'\n');
await writeFile(`${root}/report.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({images:report.length,bytes:report.reduce((n,r)=>n+r.bytes,0)}));
