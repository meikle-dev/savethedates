// Visit analytics (Umami, cookieless) is read from the runtime environment like monitoring, so one image serves
// every environment. Nothing loads and nothing is sent when UMAMI_WEBSITE_ID is unset.

export type AnalyticsRuntimeConfig = { websiteId: string; scriptUrl: string };

const defaultScriptUrl = "https://cloud.umami.is/script.js";

export function analyticsConfig(): AnalyticsRuntimeConfig | null {
  const websiteId = process.env.UMAMI_WEBSITE_ID?.trim().toLowerCase();
  if (!websiteId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(websiteId)) return null;
  const scriptUrl = process.env.UMAMI_SCRIPT_URL?.trim() || defaultScriptUrl;
  try {
    if (new URL(scriptUrl).protocol !== "https:") return null;
  } catch {
    return null;
  }
  return { websiteId, scriptUrl };
}
