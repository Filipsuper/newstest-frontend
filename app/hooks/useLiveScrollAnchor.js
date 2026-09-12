"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

const hasDialog = () => [...document.querySelectorAll('[role="dialog"]')]
  .some(node => node.getClientRects().length && node.getAttribute('aria-hidden') !== 'true');

// News can arrive immediately without changing the story under the reader's
// eyes. Keep a DOM anchor, not a scrollHeight delta (other columns may change).
export function useLiveScrollAnchor() {
  const listRef = useRef(null);
  const pending = useRef(null);
  const captureAnchor = useCallback(() => {
    if (pending.current || !listRef.current || window.scrollY < 48) return;
    const rows = [...listRef.current.querySelectorAll('[data-live-news-id]')];
    const visible = rows.filter(node => {
      const rect = node.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    });
    // A second visible row can survive removal/retraction of the first one.
    if (visible.length) pending.current = visible.map(node => ({ node, top: node.getBoundingClientRect().top }));
  }, []);
  const restore = useCallback(() => {
    if (!pending.current || hasDialog()) return;
    const anchor = pending.current.find(({ node }) => node.isConnected);
    pending.current = null;
    if (!anchor) return;
    const delta = anchor.node.getBoundingClientRect().top - anchor.top;
    // Browser scroll anchoring may already have compensated. Only correct the
    // residual, without smooth movement, focus changes or jumping to new rows.
    if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: 'instant' });
  }, []);
  useLayoutEffect(restore);
  useEffect(() => {
    let frame;
    const observer = new MutationObserver(() => {
      if (!pending.current || hasDialog()) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(restore);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-hidden', 'data-closed'] });
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [restore]);
  return { listRef, captureAnchor };
}
