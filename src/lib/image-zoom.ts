/** CSS magnification with at most one source pixel per physical display pixel. */
export function imageZoomScale(sourceWidth: number, sourceHeight: number, displayWidth: number, displayHeight: number, pixelRatio: number) {
  if (![sourceWidth,sourceHeight,displayWidth,displayHeight,pixelRatio].every(n=>Number.isFinite(n) && n>0)) return 1;
  return Math.max(1,Math.min(3,sourceWidth/(displayWidth*pixelRatio),sourceHeight/(displayHeight*pixelRatio)));
}
