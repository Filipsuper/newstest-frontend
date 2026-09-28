"use client";
import { useRef, useState } from 'react';
import { useAuthContext } from '../providers/AuthProvider';
import { Button } from './ui/Button';
import { TextField } from './ui/TextField';
import { Heading, Inline, Stack, Text } from './ui/layout';

export default function NewsExclusions() {
  const { user, refreshUser } = useAuthContext();
  const [word, setWord] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(null);
  const identity = useRef(user?.email);
  identity.current = user?.email;
  async function change(keyword, operation) {
    if (pending || !user?.email) return;
    const account = user.email;
    setPending(true); setMessage(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/keyword-exclusions`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, operation }), signal: AbortSignal.timeout(12000),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.excludedKeywords)) throw new Error(data.error || 'Undantaget kunde inte sparas.');
      if (identity.current !== account) return;
      const refreshed = await refreshUser();
      if (identity.current !== account) return;
      if (!refreshed?.email) throw new Error('Valet sparades, men kontot kunde inte uppdateras. Ladda om sidan.');
      if (operation === 'add') setWord('');
      setMessage({ account, text: operation === 'add' ? 'Undantaget är sparat.' : 'Undantaget är borttaget.' });
    } catch (error) { if (identity.current === account) setMessage({ account, error: true, text: error.message }); }
    finally { setPending(false); }
  }
  if (!user?.email) return null;
  return <Stack gap={3}>
    <Heading as="h3" size="subsection">Undanta ord</Heading>
    <Text size="sm" tone="secondary">Dölj ämnes- och nyckelordsträffar som innehåller ett visst ord i rubriken eller grundtexten. Gäller även brevets personliga urval. Nyheter om bolag du följer visas alltid.</Text>
    {(user.excludedKeywords ?? []).map(value => <Inline key={value}>
      <Text size="sm">{value}</Text>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => change(value, 'remove')} aria-label={`Ta bort undantaget ${value}`}>Ta bort</Button>
    </Inline>)}
    <form onSubmit={event => { event.preventDefault(); change(word, 'add'); }}>
      <Stack gap={3}>
        <TextField label="Ord eller fras att undanta" value={word} onValueChange={setWord} maxLength={40} disabled={pending} />
        <Inline><Button type="submit" variant="secondary" loading={pending} disabled={word.trim().length < 2 || (user.excludedKeywords?.length ?? 0) >= 10}>Lägg till undantag</Button>
          <Text size="xs" tone="secondary">{user.excludedKeywords?.length ?? 0}/10 undantag</Text></Inline>
      </Stack>
    </form>
    <Text size="xs" tone="secondary">Påverkar inte hela nyhetsflödet eller mejlbevakningens inställningar. Ta bort ett undantag för att visa träffarna igen.</Text>
    {message?.account === user.email && <Text size="sm" role={message.error ? 'alert' : 'status'}>{message.text}</Text>}
  </Stack>;
}
