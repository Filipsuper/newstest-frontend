"use client";
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from './ui/Button';
import { Stack, Text } from './ui/layout';
import { storyHref, newsDate } from '../utils/newsroom';

export default function CompanyAlertExamples({ draft, identity }) {
  const key = JSON.stringify([identity, draft.importanceLevel, draft.mutedSymbols]);
  const current = useRef(key);
  current.current = key;
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  async function preview() {
    if (pending) return;
    setPending(true); setError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/company-alerts/preview`, {
        method: 'POST', credentials: 'include', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importanceLevel: draft.importanceLevel, mutedSymbols: draft.mutedSymbols }),
        signal: AbortSignal.timeout(20_000),
      });
      const data = await response.json();
      if (!response.ok || data.readOnly !== true || !Array.isArray(data.items)) throw new Error('Exemplen kunde inte hämtas. Försök igen.');
      if (current.current === key) setResult({ key, data });
    } catch { if (current.current === key) setError({ key, text: 'Exemplen kunde inte hämtas. Försök igen.' }); }
    finally { setPending(false); }
  }
  const data = result?.key === key ? result.data : null;
  return <Stack gap={3}>
    <Button variant="secondary" loading={pending} onClick={preview}>Visa exempel med dessa val</Button>
    <Text size="xs" tone="secondary">Nyheter från senaste dygnet som matchar nivå och bolagsval. Förhandsvisningen sparar inget och skickar inga mejl.</Text>
    {error?.key === key && <Text size="sm" role="alert">{error.text}</Text>}
    {data && <>
      {data.coverage?.complete !== true && <Text size="xs" role="status">Underlaget är ofullständigt. Fler nyheter kan matcha.</Text>}
      {data.items.length ? data.items.map(item => <Stack gap={1} key={item.id}>
        <Link href={storyHref(item.id, item.headline)}>{item.headline}</Link>
        <Text size="xs" tone="secondary">{newsDate(item.publishedAt)}</Text>
      </Stack>) : <Text size="sm">Inga matchningar i det hämtade underlaget.</Text>}
      <Text size="xs" tone="secondary">Det här är innehållsexempel, inte ett beräknat antal mejl. Samtycke, tysta timmar och leveransregler gäller separat.</Text>
    </>}
  </Stack>;
}
