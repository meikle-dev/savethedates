import { cp } from "node:fs/promises";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { port: { type: "string" } } });
process.env.PORT = values.port ?? process.env.PORT ?? "3000";
process.env.HOSTNAME = "0.0.0.0";

// Standalone builds omit public/static assets; include them for direct Node running.
await cp(new URL("../public", import.meta.url), new URL("../.next/standalone/public", import.meta.url), { recursive: true });
await cp(new URL("../.next/static", import.meta.url), new URL("../.next/standalone/.next/static", import.meta.url), { recursive: true });
await import("../.next/standalone/server.js");
