import assert from 'node:assert/strict';
import test from 'node:test';
import {imageZoomScale} from '../src/lib/image-zoom';

test('retina zoom respects both pixel axes and does not magnify an exhausted preview',()=>{
  assert.equal(imageZoomScale(1056,164,528,82,2),1); // current 4× coach at 2× CSS
  assert.equal(imageZoomScale(2112,328,528,82,2),2); // full master on Retina
  assert.equal(imageZoomScale(2112,328,528,82,3),4/3);
  assert.equal(imageZoomScale(2112,164,528,82,2),1); // height is limiting
  assert.equal(imageZoomScale(100,20,528,82,2),1); // low-resolution catalog fallback
  assert.equal(imageZoomScale(10000,2000,100,20,1),3); // restrained lens magnification
  assert.equal(imageZoomScale(1000,200,0,0,2),1); // unloaded/hidden image
  for(const dpr of [1,1.25,1.5,2,2.5,3,4])for(const width of [145,264,415,830]) {
    const factor=imageZoomScale(2048,400,width,width/5,dpr);
    if(factor>1){assert.ok(width*factor*dpr<=2048+1e-8);assert.ok(width/5*factor*dpr<=400+1e-8);}
  }
});
