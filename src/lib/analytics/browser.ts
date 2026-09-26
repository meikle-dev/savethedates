// Loads the Umami tracker only when configured and only on a tracked page. Automatic tracking is off: each page
// view is sent explicitly with the tracked path, so client-side navigation to a private page is never recorded.
import { fetchRuntimeConfig } from "../runtime-config-client";
import type { AnalyticsRuntimeConfig } from "./config";

type Payload = Record<string, unknown>;
type Umami = { track: (payload: (props: Payload) => Payload) => void };

let umami: Promise<Umami | null> | undefined;
let firstView = true;

function load() {
  umami ??= fetchRuntimeConfig().then((config) => {
    const analytics = config?.analytics as Partial<AnalyticsRuntimeConfig> | null | undefined;
    if (typeof analytics?.websiteId !== "string" || typeof analytics.scriptUrl !== "string") return null;
    return new Promise<Umami | null>((resolve) => {
      const script = document.createElement("script");
      script.src = analytics.scriptUrl!;
      script.defer = true;
      script.dataset.websiteId = analytics.websiteId;
      script.dataset.autoTrack = "false";
      script.dataset.doNotTrack = "true";
      script.dataset.excludeSearch = "true";
      script.onload = () => resolve((globalThis as { umami?: Umami }).umami ?? null);
      script.onerror = () => resolve(null);
      document.head.append(script);
    });
  });
  return umami;
}

export function trackPageView(path: string) {
  // Only the first view keeps the external referrer; later views are in-site navigation.
  const referrer = firstView ? undefined : "";
  firstView = false;
  return load()
    .then((tracker) => tracker?.track((props) => ({ ...props, url: path, title: document.title, ...(referrer === undefined ? {} : { referrer }) })))
    .catch(() => undefined);
}
