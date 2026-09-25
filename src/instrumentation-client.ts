import { startBrowserMonitoring } from "./lib/monitoring/browser";

// Start after the first paint so the config request and SDK never compete with page content, but no later than
// 4 s after this script runs, however slow the page load. Error boundaries also call startBrowserMonitoring directly.
const start = () => void startBrowserMonitoring();
setTimeout(start, 4000);
const startAfterPaint = () => requestAnimationFrame(() => requestAnimationFrame(start));
if (document.readyState === "complete") startAfterPaint();
else addEventListener("load", startAfterPaint, { once: true });
