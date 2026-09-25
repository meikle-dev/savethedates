import { photoMaxBytes, photoMaxPixels, photoTypes } from "./photo-limits";

export const browserMaxBytes = 60 * 1024 * 1024;
// Headroom above the server's 2000 px output. It also keeps the canvas (at most ~4.7 MP) far below iOS Safari's
// ~16.7 MP canvas limit, which many camera photos exceed.
const longEdge = 2500;
const jpegQualities = [0.9, 0.8];
const unreadableMessage = "We couldn’t read that photo. Choose a still JPEG, PNG or WebP.";

/** A photo this device can't prepare; its message is shown to the owner. */
export class PhotoPrepareError extends Error {
  name = "PhotoPrepareError";
}

export function uploadsAsChosen(file: { size: number; type: string }, pixels?: number) {
  return file.size <= photoMaxBytes && photoTypes.includes(file.type) && (pixels === undefined || pixels <= photoMaxPixels);
}

export function resizedDimensions(width: number, height: number) {
  const scale = Math.min(1, longEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function jpegName(name: string) {
  return `${name.replace(/\.[^./\\]*$/, "") || "photo"}.jpg`;
}

/**
 * Returns the file to upload: the original when the server accepts it as chosen, otherwise a smaller JPEG made on
 * this device. The server still validates whatever arrives.
 */
export async function prepareUpload(file: File): Promise<File> {
  if (file.size > browserMaxBytes) throw new PhotoPrepareError("That photo is over 60 MB. Choose a smaller one.");
  const url = URL.createObjectURL(file);
  try {
    let image: HTMLImageElement;
    try {
      image = await loadImage(url);
    } catch {
      // The server is the authority on files it accepts as chosen, so they keep its own checks and messages.
      if (uploadsAsChosen(file)) return file;
      throw new PhotoPrepareError(unreadableMessage);
    }
    // naturalWidth/Height already follow the photo's EXIF orientation, and drawImage applies it too.
    if (uploadsAsChosen(file, image.naturalWidth * image.naturalHeight)) return file;
    return await shrink(image, jpegName(file.name));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => image.naturalWidth && image.naturalHeight ? resolve(image) : reject(new Error("Empty image"));
    image.onerror = () => reject(new Error("Unreadable image"));
    image.src = url;
  });
}

async function shrink(image: HTMLImageElement, name: string) {
  const { width, height } = resizedDimensions(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new PhotoPrepareError(unreadableMessage);
  // JPEG has no transparency; without a fill, transparent PNG areas would turn black.
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);
  for (const quality of jpegQualities) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new PhotoPrepareError(unreadableMessage);
    if (blob.size <= photoMaxBytes) return new File([blob], name, { type: "image/jpeg" });
  }
  throw new PhotoPrepareError("We couldn’t make that photo small enough. Choose a different one.");
}
