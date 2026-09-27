export const GALLERY_SIZE_STORAGE_KEY = "vlacky-gallery-size";
export const GALLERY_SIZES = ["small", "medium", "large"] as const;
export type GallerySize = typeof GALLERY_SIZES[number];

export function parseGallerySize(value: unknown): GallerySize {
  return value === "medium" || value === "large" ? value : "small";
}

export const gallerySizeBootstrap = `(function(){var s="small";try{var v=localStorage.getItem("${GALLERY_SIZE_STORAGE_KEY}");if(v==="medium"||v==="large")s=v}catch(e){}document.documentElement.dataset.gallerySize=s})();`;

export function hasGallerySizeControls(pathname: string): boolean {
  return /^\/(lokomotivy|vozy|nakladni-vozy|katalog)$/.test(pathname) || /^\/soupravy(?:\/\d+)?$/.test(pathname);
}

// Scale artwork and its allocated space only; padding and typography stay fixed.
export function galleryDimension(smallPixels: number, padding = 0): string {
  return `calc(${smallPixels}px * var(--gallery-image-scale, 1) + ${padding}px)`;
}
