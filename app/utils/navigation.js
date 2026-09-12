export const PRIMARY_NAVIGATION = [
  { href: "/marknaden", label: "Marknaden" },
  { href: "/aktier", label: "Aktier" },
  { href: "/nyhetsbrev", label: "Breven" },
];

const within = (pathname, route) =>
  pathname === route || pathname.startsWith(`${route}/`);

export function isPrimaryNavigationActive(pathname, href) {
  if (within(pathname, href)) return true;
  const related = {
    "/marknaden": ["/nyhet", "/marknadsnyheter", "/bevakning", "/mina-aktier"],
    "/aktier": ["/aktie", "/screener"],
    "/nyhetsbrev": ["/morgonbrevet", "/kvallsbrevet", "/article"],
  };
  return (related[href] ?? []).some((route) => within(pathname, route));
}

// Legacy bookmarks retain their filters, including repeated query values.
// The destination is fixed; query values can never choose a redirect target.
export function canonicalWatchHref(searchParams = {}, manage = false) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (typeof entry === "string") params.append(key, entry);
    }
  }
  const query = params.toString();
  return `/marknaden/bevakning${manage ? "/hantera" : ""}${query ? `?${query}` : ""}`;
}
