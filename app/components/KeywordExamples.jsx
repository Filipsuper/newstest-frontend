"use client";
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from './ui/Button';
import { Stack, Text } from './ui/layout';
import { storyHref } from '../utils/newsroom';

export default function KeywordExamples({ keyword, identity }) {
  const key = JSON.stringify([keyword, identity]);
  const latest = useRef(key);
  latest.current = key;
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);
  async function preview() {
    if (pending) return;
    setPending(true); setFailure(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/keyword-preview`, {
        method: 'POST', credentials: 'include', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }), signal: AbortSignal.timeout(20_000),
      });
      const data = await response.json();
      if (!response.ok || data.readOnly !== true || !Array.isArray(data.items)) throw new Error();
      if (latest.current === key) setResult({ key, data });
    } catch { if (latest.current === key) setFailure(key); }
    finally { setPending(false); }
  }
  const data = result?.key === key ? result.data : null;
  return <Stack gap={3}>
    <Button variant="secondary" onClick={preview} loading={pending} disabled={keyword.trim().length < 2 || keyword.trim().length > 40}>Förhandsvisa matchningar</Button>
    {failure === key && <Text size="sm" role="alert">Matchningarna kunde inte hämtas. Försök igen.</Text>}
    {data && <>
      <Text size="xs" tone="secondary">Senaste 48 timmarna · ingenting sparas i förhandsvisningen</Text>
      {data.coverage?.complete !== true && <Text size="xs" role="status">Underlaget är ofullständigt. Fler nyheter kan matcha.</Text>}
      {data.items.length ? data.items.map(item => <Stack gap={1} key={item.id}>
        <Link href={storyHref(item.id, item.headline)}>{item.headline}</Link>
        <Text size="xs" tone="secondary">Matchar i {item.matchField === 'headline' ? 'rubriken' : 'grundtexten'}</Text>
      </Stack>) : <Text size="sm">Inga matchningar i det hämtade underlaget.</Text>}
    </>}
  </Stack>;
}
