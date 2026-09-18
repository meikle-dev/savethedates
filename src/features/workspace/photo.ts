import sharp from "sharp";

export async function preparePhoto(file: File) {
  if (!file.size || file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPEG, PNG or WebP photo up to 5 MiB.");
  }
  const input = Buffer.from(await file.arrayBuffer());
  try {
    const photo = sharp(input, { limitInputPixels: 25_000_000, failOn: "warning" });
    const metadata = await photo.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) throw new Error("Unsupported image");
    return await photo.rotate().resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch {
    throw new Error("We couldn’t read that photo. Choose a still JPEG, PNG or WebP under 25 megapixels.");
  }
}
