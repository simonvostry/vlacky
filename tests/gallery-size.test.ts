import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { gallerySizeBootstrap, GALLERY_SIZE_STORAGE_KEY, hasGallerySizeControls, parseGallerySize } from '../src/lib/gallery-size';

test('restore image size before paint, independently of theme and label preferences', () => {
 for (const value of ['small','medium','large',null,'invalid',undefined]) {
  const document={documentElement:{dataset:{theme:'dark',trainLabelsHidden:'operator',gallerySize:''}}};
  runInNewContext(gallerySizeBootstrap,{document,localStorage:{getItem(key:string){assert.equal(key,GALLERY_SIZE_STORAGE_KEY);if(value===undefined)throw Error('Storage blocked');return value;}}});
  assert.equal(document.documentElement.dataset.gallerySize,parseGallerySize(value));
  assert.equal(document.documentElement.dataset.theme,'dark');
  assert.equal(document.documentElement.dataset.trainLabelsHidden,'operator');
 }
});
test('size controls cover galleries and formations, not vehicle detail magnifiers, DCC or forms', () => {
 for(const path of ['/soupravy','/soupravy/3','/lokomotivy','/vozy','/nakladni-vozy','/katalog'])assert.ok(hasGallerySizeControls(path),path);
 for(const path of ['/vozy/118','/lokomotivy/36','/katalog/1650','/dcc','/prihlaseni','/soupravy/novy','/soupravy/3/upravit'])assert.equal(hasGallerySizeControls(path),false,path);
});
