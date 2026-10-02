/**
 * Client-side photo pipeline for profile uploads.
 * Downscales in a canvas before anything touches localStorage, because a
 * phone photo (3-6 MB) would blow the 5 MB quota on the first upload and
 * silently kill profile persistence.
 */

const MAX_EDGE = 720;
const QUALITY = 0.82;
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

export async function fileToProfilePhoto(file) {
  if (!file) throw new Error('No file selected.');
  if (!/^image\//.test(file.type)) throw new Error('Photos only (JPG, PNG, WebP).');
  if (file.size > MAX_INPUT_BYTES) throw new Error('That image is over 12 MB. Export a smaller one and retry.');

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable in this browser.');
    ctx.fillStyle = '#170d22';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
    if (dataUrl.length > 1.4 * 1024 * 1024) throw new Error('Image too complex to store locally — crop it tighter and retry.');
    return { dataUrl, bytes: Math.round(dataUrl.length * 0.75), width: w, height: h };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That file could not be decoded as an image.'));
    img.src = src;
  });
}

/** EXIF-ish orientation is handled by the browser in modern Chrome/Safari via image-orientation: from-image. */
