"use client";

import { useCallback, useEffect, useState } from 'react';
import { fetchMarketOverview } from '../utils/api';
import { publicNewsPreview } from '../utils/publicNewsPreview';

const CACHE_MS = 30_000;
let cached = null;
let pending = null;

function cachedOverview() {
  return cached && Date.now() - cached.at < CACHE_MS ? cached.data : null;
}

function loadOverview(force) {
  const fresh = cachedOverview();
  if (!force && fresh) return Promise.resolve(fresh);
  if (!pending) {
    // Public data only. A consumer leaving must not cancel another consumer.
    pending = fetchMarketOverview({ signal: AbortSignal.timeout(8_000) })
      .then(data => {
        const news = Array.isArray(data?.news) ? data.news : data?.news?.items;
        if (data?.unavailable || !Array.isArray(news)) throw new Error('Nyhetsurvalet kunde inte hämtas.');
        publicNewsPreview(data); // Validate the ordinary pool before caching/rendering it.
        cached = { data, at: Date.now() };
        return data;
      }).finally(() => { pending = null; });
  }
  return pending;
}

export function usePublicMarketOverview({ enabled = true } = {}) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState(() => ({
    data: enabled ? cachedOverview() : null, error: null, loading: enabled,
  }));
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setState(previous => ({ ...previous, error: null, loading: true }));
    loadOverview(attempt > 0).then(data => {
      if (active) setState({ data, error: null, loading: false });
    }).catch(() => {
      if (active) setState(previous => ({ ...previous, error: 'Nyhetsurvalet kunde inte hämtas.', loading: false }));
    });
    return () => { active = false; };
  }, [enabled, attempt]);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  return { ...state, loading: enabled && state.loading, retry };
}
