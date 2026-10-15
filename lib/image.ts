// Crops and shrinks a picture in the browser before uploading,
// so avatars and banners are the right shape and load quickly.

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    img.src = url;
  });
}

/**
 * Crop to `aspect` (width / height), zoomed by `zoom` (1 = fit) and positioned by
 * `x`, `y` from 0 to 1 (0.5 = centered), then scale to `outWidth` pixels wide.
 */
export function cropImage(img: HTMLImageElement, aspect: number, zoom: number, x: number, y: number, outWidth: number): Promise<Blob> {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  // Largest crop box of this shape that fits, then shrink it by the zoom
  let cw = iw;
  let ch = iw / aspect;
  if (ch > ih) {
    ch = ih;
    cw = ih * aspect;
  }
  cw /= zoom;
  ch /= zoom;
  const sx = (iw - cw) * x;
  const sy = (ih - ch) * y;

  const outHeight = Math.round(outWidth / aspect);
  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, cw, ch, 0, 0, outWidth, outHeight);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.88));
}
