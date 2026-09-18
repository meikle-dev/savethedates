import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const image = await readFile(path.join(process.cwd(), "fixtures/lake-como.jpg"));
  return new Response(image, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" } });
}
