// Local-only, read-only owner dashboard: every couple on the configured Supabase project with payment, publication
// and feature status. Run with `npm run admin`. Never deployed: it lives outside the Next.js app.
//
// Credentials come from the environment or the ignored `.env.admin` file: ADMIN_SUPABASE_URL and
// ADMIN_SUPABASE_SECRET_KEY (a secret/service-role key, so it bypasses RLS). The key stays in this process; the
// browser only receives the summarised rows below. Share secrets, guest names and wedding content are never read.
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.admin")) process.loadEnvFile(".env.admin");
const url = process.env.ADMIN_SUPABASE_URL;
const key = process.env.ADMIN_SUPABASE_SECRET_KEY;
const port = Number(process.env.ADMIN_PORT || 4400);
if (!url || !key) {
  console.error(`${existsSync(".env.admin") ? "Missing" : "No .env.admin file, so missing"} ${[!url && "ADMIN_SUPABASE_URL", !key && "ADMIN_SUPABASE_SECRET_KEY"].filter(Boolean).join(" and ")}. Add it to .env.admin; see "Owner admin dashboard" in run-app-instructions.md.`);
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const host = new URL(url).hostname;
const project = host.endsWith(".supabase.co") ? host.split(".")[0] : "local";

async function allUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function rows(table, columns) {
  const { data, error } = await admin.from(table).select(columns);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

async function snapshot() {
  const [users, weddings, payments, responses] = await Promise.all([
    allUsers(),
    rows("weddings", "id, owner_id, first_name, second_name, wedding_date, location, slug, published, first_published_at, updated_at, theme, photo_path, invitation_enabled, details_enabled, rsvp_enabled, meal_choices_enabled"),
    rows("stripe_payments", "wedding_id, paid_at, expires_at, revoked_reason, amount_total"),
    rows("shared_rsvp_responses", "wedding_id, attending"),
  ]);
  const now = Date.now();
  const latestPayment = new Map();
  for (const p of payments) {
    const current = latestPayment.get(p.wedding_id);
    if (!current || p.paid_at > current.paid_at) latestPayment.set(p.wedding_id, p);
  }
  const replies = new Map();
  for (const r of responses) {
    const count = replies.get(r.wedding_id) ?? { total: 0, attending: 0 };
    count.total++;
    if (r.attending) count.attending++;
    replies.set(r.wedding_id, count);
  }
  const byOwner = new Map(weddings.map((w) => [w.owner_id, w]));
  const couples = users.map((user) => {
    const account = { email: user.email ?? "", provider: user.app_metadata?.provider ?? "email", signedUpAt: user.created_at, lastSignInAt: user.last_sign_in_at ?? null, confirmed: !!(user.email_confirmed_at || user.confirmed_at) };
    const w = byOwner.get(user.id);
    if (!w) return { ...account, started: false };
    const p = latestPayment.get(w.id);
    const payment = !p ? "unpaid" : p.revoked_reason ?? (Date.parse(p.expires_at) > now ? "paid" : "expired");
    return {
      ...account,
      started: true,
      names: `${w.first_name} & ${w.second_name}`,
      weddingDate: w.wedding_date,
      location: w.location,
      slug: w.slug,
      theme: w.theme,
      payment,
      amount: p?.amount_total ?? null,
      paidAt: p?.paid_at ?? null,
      expiresAt: p?.expires_at ?? null,
      site: w.published ? (payment === "paid" ? "live" : "offline") : "draft",
      firstPublishedAt: w.first_published_at,
      updatedAt: w.updated_at,
      features: { photo: !!w.photo_path, invitation: w.invitation_enabled, details: w.details_enabled, rsvp: w.rsvp_enabled, meals: w.meal_choices_enabled },
      replies: replies.get(w.id) ?? { total: 0, attending: 0 },
    };
  });
  const revenue = payments.filter((p) => !p.revoked_reason).reduce((sum, p) => sum + p.amount_total, 0);
  return { project, fetchedAt: new Date().toISOString(), revenue, couples };
}

const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
const security = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
  "content-security-policy": "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
};

createServer(async (req, res) => {
  // Refusing other Host headers stops DNS-rebinding pages from reading the data through this port.
  if (!allowedHosts.has(req.headers.host ?? "") || req.method !== "GET") {
    res.writeHead(403, security).end("Forbidden");
    return;
  }
  const path = new URL(req.url ?? "/", "http://localhost").pathname;
  if (path === "/") return res.writeHead(200, { ...security, "content-type": "text/html; charset=utf-8" }).end(page);
  if (path === "/app.js") return res.writeHead(200, { ...security, "content-type": "text/javascript; charset=utf-8" }).end(script);
  if (path === "/data.json") {
    try {
      res.writeHead(200, { ...security, "content-type": "application/json" }).end(JSON.stringify(await snapshot()));
    } catch (error) {
      console.error(error);
      res.writeHead(502, { ...security, "content-type": "application/json" }).end(JSON.stringify({ error: String(error.message ?? error) }));
    }
    return;
  }
  res.writeHead(404, security).end("Not found");
}).listen(port, "127.0.0.1", () => {
  console.log(`SaveTheDates admin (${project}, read-only): http://localhost:${port}`);
});

const page = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>SaveTheDates Admin</title>
<style>
:root {
  --bg: #f6f5f2; --panel: #ffffff; --ink: #1b1d22; --muted: #6b6f78; --line: #e6e3dd; --soft: #f1efea;
  --accent: #1f4b52; --green: #1c7a4a; --green-bg: #e3f3ea; --amber: #9a6208; --amber-bg: #fbf0dc;
  --red: #b3372f; --red-bg: #fbe6e3; --grey-bg: #eeede9; --blue: #2e5aa8; --blue-bg: #e5edfb;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #111316; --panel: #191c20; --ink: #eceae6; --muted: #979ba3; --line: #2a2e34; --soft: #20242a;
    --accent: #8fc7cf; --green: #6fd09b; --green-bg: #173427; --amber: #e9b35a; --amber-bg: #3a2c14;
    --red: #f08b82; --red-bg: #3d1d1a; --grey-bg: #262a30; --blue: #93b4f0; --blue-bg: #1b2842;
    color-scheme: dark;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.wrap { max-width: 1320px; margin: 0 auto; padding: 28px 24px 60px; }
header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
h1 { margin: 0; font-size: 22px; letter-spacing: -0.01em; }
.sub { color: var(--muted); font-size: 13px; margin-top: 2px; }
.env { display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 999px; background: var(--accent); color: var(--bg); font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; vertical-align: 3px; }
button { font: inherit; cursor: pointer; }
.refresh { border: 1px solid var(--line); background: var(--panel); color: var(--ink); border-radius: 10px; padding: 8px 14px; font-weight: 500; }
.refresh:hover { border-color: var(--muted); }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 16px 18px; }
.card .label { color: var(--muted); font-size: 12px; font-weight: 500; }
.card .value { font-size: 28px; font-weight: 650; letter-spacing: -0.02em; margin-top: 4px; font-variant-numeric: tabular-nums; }
.card .note { color: var(--muted); font-size: 12px; margin-top: 2px; }
.bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { border: 1px solid var(--line); background: var(--panel); color: var(--muted); border-radius: 999px; padding: 6px 12px; font-size: 13px; }
.chip[aria-pressed="true"] { background: var(--ink); color: var(--bg); border-color: var(--ink); }
.chip span { opacity: .7; margin-left: 4px; font-variant-numeric: tabular-nums; }
input[type=search] { font: inherit; border: 1px solid var(--line); background: var(--panel); color: var(--ink); border-radius: 10px; padding: 8px 12px; width: min(280px, 100%); }
.table { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 11px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); padding: 12px 14px; border-bottom: 1px solid var(--line); white-space: nowrap; }
th[data-sort] { cursor: pointer; user-select: none; }
th[data-sort]:hover { color: var(--ink); }
th.c, td.c { text-align: center; }
td { padding: 12px 14px; border-bottom: 1px solid var(--line); vertical-align: middle; white-space: nowrap; }
tr:last-child td { border-bottom: 0; }
tbody tr:hover { background: var(--soft); }
.names { font-weight: 600; }
.small { color: var(--muted); font-size: 12px; }
.badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.badge::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.green { color: var(--green); background: var(--green-bg); }
.amber { color: var(--amber); background: var(--amber-bg); }
.red { color: var(--red); background: var(--red-bg); }
.grey { color: var(--muted); background: var(--grey-bg); }
.blue { color: var(--blue); background: var(--blue-bg); }
.tick { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; font-size: 13px; font-weight: 700; }
.tick.on { color: var(--green); background: var(--green-bg); }
.tick.off { color: var(--line); }
.num { font-variant-numeric: tabular-nums; }
.empty, .error { padding: 40px; text-align: center; color: var(--muted); }
.error { color: var(--red); white-space: pre-wrap; }
footer { margin-top: 14px; color: var(--muted); font-size: 12px; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div>
      <h1>SaveTheDates <span class="env" id="env">…</span></h1>
      <div class="sub" id="fetched">Loading…</div>
    </div>
    <button class="refresh" id="refresh" type="button">Refresh</button>
  </header>
  <section class="cards" id="cards" aria-label="Totals"></section>
  <div class="bar">
    <div class="chips" id="chips" role="group" aria-label="Filter"></div>
    <input type="search" id="search" placeholder="Search names, email, location" aria-label="Search">
  </div>
  <div class="table" id="table"></div>
  <footer>Read-only and local only. Payment: latest purchase per wedding. Live means published with an active purchase.</footer>
</div>
<script src="/app.js"></script>
</body>
</html>`;

const script = `
const state = { data: null, filter: "all", query: "", sort: "signedUpAt", dir: -1 };
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const day = (d) => d ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d)) : "—";
const ago = (d) => {
  if (!d) return "never";
  const s = (Date.now() - Date.parse(d)) / 1000;
  if (s < 3600) return Math.max(1, Math.round(s / 60)) + "m ago";
  if (s < 86400) return Math.round(s / 3600) + "h ago";
  if (s < 86400 * 60) return Math.round(s / 86400) + "d ago";
  return day(d);
};
const until = (d) => {
  if (!d) return "";
  const n = Math.round((Date.parse(d) - Date.now()) / 86400000);
  return n > 0 ? "in " + n + " days" : n === 0 ? "today" : Math.abs(n) + " days ago";
};
const money = (p) => "£" + (p / 100).toLocaleString("en-GB", { minimumFractionDigits: p % 100 ? 2 : 0 });

const payBadge = { paid: ["green", "Paid"], unpaid: ["grey", "Unpaid"], expired: ["amber", "Expired"], refunded: ["red", "Refunded"], disputed: ["red", "Disputed"] };
const siteBadge = { live: ["green", "Live"], draft: ["grey", "Draft"], offline: ["amber", "Offline"] };
const badge = ([tone, text]) => '<span class="badge ' + tone + '">' + text + "</span>";
const tick = (on) => on ? '<span class="tick on" aria-label="On">✓</span>' : '<span class="tick off" aria-label="Off">–</span>';

const filters = [
  ["all", "All", () => true],
  ["live", "Live", (c) => c.site === "live"],
  ["paid-unpublished", "Paid, not published", (c) => c.payment === "paid" && c.site === "draft"],
  ["unpaid", "Unpaid", (c) => c.started && c.payment === "unpaid"],
  ["attention", "Expired / refunded", (c) => c.started && ["expired", "refunded", "disputed"].includes(c.payment)],
  ["not-started", "No site yet", (c) => !c.started],
];

const columns = [
  ["names", "Couple"], ["weddingDate", "Wedding"], ["payment", "Payment"], ["site", "Site"],
  ["photo", "Photo", "c"], ["invitation", "Invitation", "c"], ["details", "Details", "c"], ["rsvp", "RSVP", "c"], ["meals", "Meals", "c"],
  ["replies", "Replies", "c"], ["signedUpAt", "Signed up"], ["lastSignInAt", "Last seen"],
];

function sortValue(c, key) {
  if (c.features && key in c.features) return c.features[key] ? 1 : 0;
  if (key === "replies") return c.replies?.total ?? -1;
  if (key === "names") return (c.names ?? "~" + c.email).toLowerCase();
  return c[key] ?? "";
}

function render() {
  const { data } = state;
  const couples = data.couples;
  const started = couples.filter((c) => c.started);
  const count = (f) => couples.filter(f).length;
  const cards = [
    ["Accounts", couples.length, count((c) => !c.started) + " without a site"],
    ["Couples", started.length, "saved a wedding"],
    ["Paid", count((c) => c.payment === "paid"), count((c) => c.payment === "paid" && c.amount === 0) + " free via promo"],
    ["Live", count((c) => c.site === "live"), count((c) => c.payment === "paid" && c.site === "draft") + " paid, not published"],
    ["Revenue", money(data.revenue), "excl. refunds and disputes"],
    ["RSVP replies", started.reduce((n, c) => n + c.replies.total, 0), started.reduce((n, c) => n + c.replies.attending, 0) + " attending"],
  ];
  $("cards").innerHTML = cards.map(([label, value, note]) => '<div class="card"><div class="label">' + label + '</div><div class="value">' + esc(value) + '</div><div class="note">' + esc(note) + "</div></div>").join("");
  $("chips").innerHTML = filters.map(([id, label, f]) => '<button type="button" class="chip" data-filter="' + id + '" aria-pressed="' + (state.filter === id) + '">' + label + "<span>" + count(f) + "</span></button>").join("");

  const q = state.query.trim().toLowerCase();
  const test = filters.find(([id]) => id === state.filter)[2];
  const shown = couples
    .filter(test)
    .filter((c) => !q || [c.names, c.email, c.location, c.slug].some((v) => v && v.toLowerCase().includes(q)))
    .sort((a, b) => { const x = sortValue(a, state.sort), y = sortValue(b, state.sort); return (x > y ? 1 : x < y ? -1 : 0) * state.dir; });

  if (!shown.length) { $("table").innerHTML = '<div class="empty">No couples match.</div>'; return; }
  const head = "<tr>" + columns.map(([key, label, cls]) => '<th data-sort="' + key + '" class="' + (cls ?? "") + '">' + label + (state.sort === key ? (state.dir > 0 ? " ↑" : " ↓") : "") + "</th>").join("") + "</tr>";
  const body = shown.map((c) => {
    const who = c.started
      ? '<div class="names">' + esc(c.names) + '</div><div class="small">' + esc(c.email) + (c.provider === "google" ? " · Google" : "") + "</div>"
      : '<div class="names small">No site yet</div><div class="small">' + esc(c.email) + (c.confirmed ? "" : " · unconfirmed") + "</div>";
    if (!c.started) return "<tr><td>" + who + '</td><td colspan="9" class="small">Signed up but hasn’t saved a wedding</td><td>' + day(c.signedUpAt) + "</td><td>" + ago(c.lastSignInAt) + "</td></tr>";
    const pay = badge(payBadge[c.payment]) + (c.paidAt ? '<div class="small">' + (c.amount === 0 ? "Free (promo)" : money(c.amount)) + " · " + day(c.paidAt) + "</div>" : "");
    const site = badge(siteBadge[c.site]) + (c.site === "live" ? '<div class="small">since ' + day(c.firstPublishedAt) + "</div>" : "");
    const f = c.features;
    return "<tr><td>" + who + "</td>"
      + "<td>" + day(c.weddingDate) + '<div class="small">' + esc(c.location) + " · " + until(c.weddingDate) + "</div></td>"
      + "<td>" + pay + "</td><td>" + site + "</td>"
      + [f.photo, f.invitation, f.details, f.rsvp, f.meals].map((on) => '<td class="c">' + tick(on) + "</td>").join("")
      + '<td class="c num">' + (c.replies.total ? c.replies.total + '<div class="small">' + c.replies.attending + " yes</div>" : '<span class="small">0</span>') + "</td>"
      + "<td>" + day(c.signedUpAt) + "</td><td>" + ago(c.lastSignInAt) + "</td></tr>";
  }).join("");
  $("table").innerHTML = "<table><thead>" + head + "</thead><tbody>" + body + "</tbody></table>";
}

async function load() {
  $("refresh").disabled = true;
  $("fetched").textContent = "Loading…";
  try {
    const response = await fetch("/data.json", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || response.statusText);
    state.data = json;
    $("env").textContent = json.project;
    $("fetched").textContent = "Updated " + new Date(json.fetchedAt).toLocaleTimeString("en-GB");
    render();
  } catch (error) {
    $("fetched").textContent = "Couldn’t load data";
    $("table").innerHTML = '<div class="error">' + esc(error.message) + "</div>";
  } finally {
    $("refresh").disabled = false;
  }
}

$("refresh").addEventListener("click", load);
$("search").addEventListener("input", (e) => { state.query = e.target.value; if (state.data) render(); });
$("chips").addEventListener("click", (e) => { const b = e.target.closest("[data-filter]"); if (b) { state.filter = b.dataset.filter; render(); } });
$("table").addEventListener("click", (e) => {
  const th = e.target.closest("th[data-sort]");
  if (!th) return;
  state.dir = state.sort === th.dataset.sort ? -state.dir : -1;
  state.sort = th.dataset.sort;
  render();
});
load();
`;
