"use client";

import { useEffect, useState } from "react";
import { fetchStoryStockChart } from "../utils/api";
import { storyStockChartFor } from "../utils/storyStockChart";
import StoryStockChart from "./StoryStockChart";
import { Button } from "./ui/Button";
import { Skeleton } from "./ui/data";
import { Inline, Stack, Text } from "./ui/layout";

// Only mounted inside an opened news reader, never on feed rows. Changing the
// shared company selector cancels the old request and hides the old company's
// curve immediately. Tick data is read from the existing cache, not archived.
export default function StoryStockHistory({ story, symbol = story.symbol ?? story.companies?.[0]?.symbol,
  refreshKey = 0, previewCharts }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const id = story.id, version = story.version ?? 1, published = story.ts ?? story.publishedAt;
  const chart = storyStockChartFor(story, symbol, previewCharts?.[symbol] ?? result);

  useEffect(() => {
    if (previewCharts || !id || !symbol) return;
    let active = true;
    let inFlight = false;
    let controller;
    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);
      setLoading(true);
      try {
        const incoming = await fetchStoryStockChart(id, symbol, { signal: controller.signal });
        const valid = storyStockChartFor(story, symbol, incoming);
        if (!valid) throw new Error("invalid_chart");
        if (active) { setResult(valid); setError(""); }
      } catch (failure) {
        if (active) setError("Aktiekurvan kunde inte hämtas.");
      } finally {
        clearTimeout(timeout);
        inFlight = false;
        if (active) setLoading(false);
      }
    };
    load();
    const refresh = () => { if (document.visibilityState === "visible") load(); };
    const timer = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { active = false; controller?.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [id, version, published, symbol, refreshKey, retry, previewCharts]);

  if (!symbol) return null;
  if (chart?.status === "available") return <Stack gap={2}>
    <StoryStockChart chart={chart} />
    {error && <Inline><Text size="xs" tone="secondary">Visar tidigare hämtad kurva.</Text><Button variant="ghost" size="sm" onClick={() => setRetry(value => value + 1)}>Försök igen</Button></Inline>}
  </Stack>;
  if (loading && !previewCharts && !chart) return <Stack gap={3} aria-label="Hämtar aktiekurva" aria-busy="true">
    <Text size="sm" tone="secondary">Aktiekurs</Text><Skeleton style={{ height: 180 }} />
  </Stack>;
  return <Inline>
    <Text size="sm" tone="secondary">{error || (chart?.status === "pending" ? "Aktiekurvan visas när handeln börjar." : "Aktiekurva saknas för handelsdagen.")}</Text>
    {!previewCharts && <Button variant="ghost" size="sm" onClick={() => setRetry(value => value + 1)} disabled={loading}>Försök igen</Button>}
  </Inline>;
}
