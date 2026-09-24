import { z } from "zod";
import { themes, type WeddingTheme } from "./themes";

export const photoPages = ["saveTheDate", "details"] as const;
export type PhotoPage = typeof photoPages[number];

export const photoFrameSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  zoom: z.number().min(1).max(2),
}).strict();

const themePhotoFramingSchema = z.object({
  saveTheDate: photoFrameSchema.optional(),
  details: photoFrameSchema.optional(),
}).strict();

export const photoFramingSchema = z.object(
  Object.fromEntries(themes.map(({ id }) => [id, themePhotoFramingSchema.optional()])) as Record<WeddingTheme, z.ZodOptional<typeof themePhotoFramingSchema>>,
).strict();

export type PhotoFrame = z.infer<typeof photoFrameSchema>;
export type PhotoFraming = z.infer<typeof photoFramingSchema>;

const defaults: Record<PhotoPage, PhotoFrame> = {
  saveTheDate: { x: 50, y: 50, zoom: 1 },
  details: { x: 50, y: 60, zoom: 1 },
};

export function defaultPhotoFrame(page: PhotoPage): PhotoFrame {
  return { ...defaults[page] };
}

export function parsePhotoFraming(value: unknown): PhotoFraming {
  const parsed = photoFramingSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

export function resolvePhotoFrame(framing: PhotoFraming | undefined, theme: WeddingTheme, page: PhotoPage): PhotoFrame {
  return { ...defaults[page], ...framing?.[theme]?.[page] };
}

export function setPhotoFrame(framing: PhotoFraming, theme: WeddingTheme, page: PhotoPage, frame: PhotoFrame): PhotoFraming {
  return photoFramingSchema.parse({
    ...framing,
    [theme]: { ...framing[theme], [page]: photoFrameSchema.parse(frame) },
  });
}

