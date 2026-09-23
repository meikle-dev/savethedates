// URL state, search pattern and pagination for the Guests table. Pure so it can be unit tested.

export const guestPageSize = 25;
export const guestFilters = ["all", "attending", "not-attending"] as const;
export type GuestFilter = (typeof guestFilters)[number];
export type GuestQuery = { filter: GuestFilter; q: string; page: number };

type SearchParam = string | string[] | undefined;
const maxSearchLength = 80;

function single(value: SearchParam) {
  return Array.isArray(value) ? value[0] : value;
}

// Unknown filters and invalid, zero or negative pages fall back to the defaults.
export function parseGuestQuery(params: Record<string, SearchParam>): GuestQuery {
  const filter = single(params.filter);
  const page = single(params.page) ?? "";
  // PostgREST reads `*` as a wildcard, so it is dropped rather than searched for.
  const q = Array.from((single(params.q) ?? "").replace(/\*/g, "").replace(/\s+/g, " ").trim()).slice(0, maxSearchLength).join("").trim();
  return {
    filter: guestFilters.includes(filter as GuestFilter) ? filter as GuestFilter : "all",
    q,
    page: /^[1-9]\d{0,5}$/.test(page) ? Number(page) : 1,
  };
}

// Case-insensitive "contains" pattern with the LIKE wildcards escaped.
export function namePattern(q: string) {
  return `%${q.replace(/[\\%_]/g, "\\$&")}%`;
}

export function guestHref({ filter, q, page }: GuestQuery) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/dashboard/guests?${search}` : "/dashboard/guests";
}

export function filteredCount(filter: GuestFilter, counts: { total: number; attending: number }) {
  if (filter === "attending") return counts.attending;
  if (filter === "not-attending") return counts.total - counts.attending;
  return counts.total;
}

// Inclusive row range for the page. A page past the end is out of range; an empty list is not.
export function guestPagination(count: number, page: number) {
  const pages = Math.max(1, Math.ceil(count / guestPageSize));
  const from = (page - 1) * guestPageSize;
  return { pages, from, to: Math.min(from + guestPageSize, count) - 1, outOfRange: count > 0 && page > pages };
}
