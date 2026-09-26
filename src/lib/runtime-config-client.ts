// One no-store request per page load serves every browser integration (monitoring and analytics).
const shared = ((globalThis as { __saveTheDatesRuntimeConfig?: { config?: Promise<Record<string, unknown> | null> } }).__saveTheDatesRuntimeConfig ??= {});

export function fetchRuntimeConfig() {
  shared.config ??= fetch("/api/runtime-config", { cache: "no-store", credentials: "omit" })
    .then(async (response) => (response.ok ? ((await response.json()) as Record<string, unknown>) : null))
    .catch(() => null);
  return shared.config;
}
