export const PRIMARY_NAVIGATION = [
  { href: "/marknaden", label: "Marknaden" },
  { href: "/marknaden/bevakning", label: "Mina bolag" },
  { href: "/aktier", label: "Aktier" },
  { href: "/aktier/screener", label: "Screener" },
  { href: "/nyhetsbrev", label: "Breven" },
];

const within = (pathname, route) =>
  pathname === route || pathname.startsWith(`${route}/`);

// An intercepted news reader is a root parallel route: the content route stays
// mounted underneath it. Keep that source's navigation context until the reader
// is closed; a direct/shared news URL has no intercepted slot and uses its URL.
export function navigationPathname(pathname, contentSegments = [], storySegments = []) {
  if (!storySegments?.includes("(.)nyhet")) return pathname;
  const segments = (contentSegments ?? []).filter((segment) =>
    typeof segment === "string" && !segment.startsWith("("));
  return `/${segments.join("/")}`;
}

// Personal news and screening retain their canonical nested URLs, but are
// distinct product destinations. Resolve them before their parent routes so
// only one item is current in either the header or the mobile navigation.
export function primaryNavigationHref(pathname = "") {
  const destinations = [
    ["/marknaden/bevakning", ["/marknaden/bevakning", "/bevakning", "/mina-aktier"]],
    ["/aktier/screener", ["/aktier/screener", "/screener"]],
    ["/marknaden", ["/marknaden", "/nyhet", "/story", "/marknadsnyheter"]],
    ["/aktier", ["/aktier", "/aktie"]],
    ["/nyhetsbrev", ["/nyhetsbrev", "/morgonbrevet", "/kvallsbrevet", "/article"]],
  ];
  return destinations.find(([, routes]) => routes.some((route) => within(pathname, route)))?.[0] ?? null;
}

export function isPrimaryNavigationActive(pathname, href) {
  return primaryNavigationHref(pathname) === href;
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
