"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Intercepted story routes keep the feed mounted, but replace its URL context. */
export function useFeedSearchParams() {
  const pathname = usePathname();
  const current = useSearchParams().toString();
  const [feedQuery, setFeedQuery] = useState(current);
  const readingStory = pathname?.startsWith('/nyhet/');
  if (!readingStory && feedQuery !== current) setFeedQuery(current);
  const query = readingStory ? feedQuery : current;
  return useMemo(() => new URLSearchParams(query), [query]);
}
