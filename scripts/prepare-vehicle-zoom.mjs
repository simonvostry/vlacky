// Export larger detail-only derivatives from the same approved cutouts, never upscale.
// Private masters and reference photos stay in output/; only artwork derivatives ship.
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const enhanced = JSON.parse(await readFile('src/lib/enhanced-vehicle-images.json','utf8'));
const masters = {};
for (const item of JSON.parse(await readFile('output/train-image-enhancements/inventory.json','utf8'))) {
  const name = item.path.split('/').pop().replace(/\.gif$/,'');
  masters[item.path] = name === 'cd-193-vectron' ? 'output/image-upscale-samples/vectron-ai.png' : name === 'cd-bmee' ? 'output/image-upscale-samples/bmee-ai-transparent.png' : `output/train-image-enhancements/${name}.png`;
}
for (const item of JSON.parse(await readFile('src/db/data/ex250-1992.json','utf8')).vehicles) masters[item.imagePath] = `output/train-250-1992/masters/${item.key}.png`;
Object.assign(masters, {
  '/img/catalog/642-regiojet-ai.png':'output/desiro-regiojet/regiojet-642-master.png',
  '/img/catalog/642-vogtlandbahn-ai.png':'output/desiro-742004/vogtlandbahn-642-master.png',
  '/img/owned/vehicle-36-yellow-v1.png':'output/brejlovec-36-yellow-details/master-v1.png',
  '/img/owned/db-lgs579-dhl-weathered.png':'output/freight-dhl-custom/master.png',
  '/img/catalog/dlb-bmz-alex-881901.png':'output/alex-881901/bmz-master.png',
  '/img/catalog/dlb-abbmdz-alex-881901.png':'output/alex-881901/abbmdz-master.png',
  '/img/catalog/cdc-rils-gray-modern-logo.png':'output/freight-837708/master.png',
  '/img/catalog/csd-uacs-raj-yellow-brown.png':'output/freight-uacs/uacs-csd-side-v2.png',
  '/img/catalog/cdc-sggmrrs-90-gigawood.png':'output/freight-sggmrrs/master-v3.png',
});
for (const item of JSON.parse(await readFile('output/freight-fleischmann/exports.json','utf8'))) masters[item.source] = `output/freight-fleischmann/${item.sku}/master.png`;
for (const item of JSON.parse(await readFile('output/freight-covered/exports.json','utf8'))) masters[item.source] = `output/freight-covered/${item.master}`;
async function bounds(file) {
  const {data,info} = await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=-1,bottom=-1,transparent=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const alpha=data[(y*info.width+x)*info.channels+info.channels-1];
    if(alpha===0)transparent++;
    if(alpha>10){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  }
  if(right<left || transparent<info.width*info.height*.02)throw new Error(`Not a transparent cutout: ${file}`);
  return {left,top,width:right-left+1,height:bottom-top+1,canvasWidth:info.width,canvasHeight:info.height};
}
await mkdir('public/img/zoom',{recursive:true});
const mapping={},report=[];
for(const [source,preview] of Object.entries(enhanced)){
  const master=masters[source];
  if(!master)throw new Error(`No reviewed master mapping for ${source}`);
  const art=await bounds(master),base=await bounds(`public${preview}`);
  // Keep the approved UI geometry/padding, bounded by real pixels in BOTH axes.
  const ratio=Math.min(art.width/base.width,art.height/base.height);
  if(ratio<=1.02){report.push({source,skipped:'Existing derivative already reaches master resolution'});continue;}
  const width=Math.floor(base.canvasWidth*ratio),height=Math.floor(base.canvasHeight*ratio);
  const left=Math.floor(base.left*ratio),top=Math.floor(base.top*ratio);
  const artWidth=Math.floor(base.width*ratio),artHeight=Math.floor(base.height*ratio);
  const src=`/img/zoom/${preview.split('/').pop()}`;
  await sharp(master).extract({left:art.left,top:art.top,width:art.width,height:art.height})
    .resize(artWidth,artHeight,{fit:'fill',withoutEnlargement:true})
    .extend({left,top,right:width-left-artWidth,bottom:height-top-artHeight,background:'#00000000'})
    .webp({quality:92,alphaQuality:100,effort:6}).toFile(`public${src}`);
  mapping[source]={src,width,height};
  report.push({source,master,width,height,masterCrop:{width:art.width,height:art.height},artWidth,artHeight});
}
await writeFile('src/lib/zoom-vehicle-images.json',JSON.stringify(mapping,null,2)+'\n');
await writeFile('output/image-zoom/export-report.json',JSON.stringify(report,null,2)+'\n');
console.log({exported:Object.keys(mapping).length,skipped:report.filter(r=>r.skipped).length});
