import sharp from "sharp";

// A small host (512 MB, 0.5 CPU) must decode one photo at a time: libvips would otherwise start a thread per
// detected host CPU and keep an operation cache. Measurements and upgrade triggers: docs/operations.md.
sharp.concurrency(1);
sharp.cache(false);

export const photoBusyMessage = "Photo uploads are busy — please try again in a moment.";

/** An expected refusal whose message is shown to the owner; `reason` is logged. */
export class PhotoRejectedError extends Error {
  name = "PhotoRejectedError";
  reason: "size" | "type" | "pixels" | "unreadable" | "busy";
  constructor(message: string, reason: PhotoRejectedError["reason"]) {
    super(message);
    this.reason = reason;
  }
}

const maxWaiting = 3;
const maxWaitMs = 20_000;

let processing = false;
const waiting: Array<() => void> = [];

/** Resolves with a release function once this request may process a photo; rejects with the busy message. */
function acquirePhotoSlot(): Promise<() => void> {
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    const next = waiting.shift();
    if (next) next();
    else processing = false;
  };
  if (!processing) {
    processing = true;
    return Promise.resolve(release);
  }
  if (waiting.length >= maxWaiting) return Promise.reject(new PhotoRejectedError(photoBusyMessage, "busy"));
  return new Promise((resolve, reject) => {
    const grant = () => {
      clearTimeout(timer);
      resolve(release);
    };
    const timer = setTimeout(() => {
      waiting.splice(waiting.indexOf(grant), 1);
      reject(new PhotoRejectedError(photoBusyMessage, "busy"));
    }, maxWaitMs);
    waiting.push(grant);
  });
}

export async function preparePhoto(file: File) {
  const invalid = !file.size || file.size > 5 * 1024 * 1024 ? "size" : !["image/jpeg", "image/png", "image/webp"].includes(file.type) ? "type" : null;
  if (invalid) throw new PhotoRejectedError("Choose a JPEG, PNG or WebP photo up to about 5 MB.", invalid);
  const release = await acquirePhotoSlot();
  try {
    return await convertPhoto(Buffer.from(await file.arrayBuffer()));
  } finally {
    release();
  }
}

async function convertPhoto(input: Buffer) {
  try {
    // autoOrient is applied after the resize, so JPEG/WebP shrink-on-load stays available and the full-size
    // image is never rotated in memory.
    const photo = sharp(input, { limitInputPixels: 25_000_000, failOn: "warning", autoOrient: true });
    const metadata = await photo.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) throw new Error("Unsupported image");
    // Full-quality JPEG resampling avoids moiré on fine fabric patterns. sharp only shrinks WebP on load in fast
    // mode; without it a 24 MP WebP peaks at ~210 MB instead of ~50 MB, so WebP keeps fast shrink-on-load.
    const fastShrinkOnLoad = metadata.format === "webp";
    return await photo.resize(2000, 2000, { fit: "inside", withoutEnlargement: true, fastShrinkOnLoad }).webp({ quality: 85 }).toBuffer();
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("pixel limit") ? "pixels" : "unreadable";
    throw new PhotoRejectedError("We couldn’t read that photo. Choose a still JPEG, PNG or WebP under 25 megapixels.", reason);
  }
}
