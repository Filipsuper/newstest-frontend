"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { requestNewsletterPreferences } from "../utils/newsletterPreferences";
import { Button } from "./ui/Button";
import { Switch } from "./ui/Choices";
import { Inline, Stack, Text } from "./ui/layout";
import { Skeleton } from "./ui/data";
import styles from "./onboarding.module.css";

/** Mount keyed by account. The subscription store, not the account's legacy
 * preference array, is authoritative after an unsubscribe or confirmation. */
export default function NewsletterPreferences({ onContinue, onDraftStateChange }) {
  const [resource, setResource] = useState(null);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const pending = useRef(null);
  const dirty = Boolean(resource && JSON.stringify([...selected].sort()) !== JSON.stringify([...resource.selected].sort()));
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    requestNewsletterPreferences({ signal: controller.signal }).then(value => {
      if (controller.signal.aborted) return;
      setResource(value); setSelected(value.selected); setError(null); setMessage("");
    }).catch(failure => { if (!controller.signal.aborted) setError(failure); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => { onDraftStateChange?.({ dirty, busy }); }, [dirty, busy, onDraftStateChange]);
  useEffect(() => () => onDraftStateChange?.({ dirty: false, busy: false }), [onDraftStateChange]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = event => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);

  async function save() {
    if (pending.current || !resource || loading || error?.status === 409) return;
    if (!dirty) { onContinue?.(); return; }
    const controller = new AbortController();
    pending.current = controller; setBusy(true); setError(null); setMessage("");
    try {
      const value = await requestNewsletterPreferences({ draft: { selected, revision: resource.revision }, signal: controller.signal });
      if (controller.signal.aborted) return;
      setResource(value); setSelected(value.selected); setMessage("Brevval sparade."); onContinue?.();
    } catch (failure) { if (!controller.signal.aborted) setError(failure); }
    finally { pending.current = null; if (!controller.signal.aborted) setBusy(false); }
  }
  return <Stack gap={4}>
    {loading ? <Skeleton /> : resource && <Stack gap={3}>
      {resource.catalog.map(letter => <div className={styles.notice} key={letter.id}>
        <Switch label={onContinue && letter.id === "morning" ? "Morgonbrevet på mejl – gratis" : letter.title}
          description={letter.description} checked={selected.includes(letter.id)}
          disabled={busy || error?.status === 409} onCheckedChange={checked => {
            setSelected(previous => checked ? [...previous, letter.id] : previous.filter(id => id !== letter.id));
            setMessage("");
          }} />
      </div>)}
      <Text size="sm" tone="secondary">Kvällsbrevet läser du på <Link href="/kvallsbrevet" className={styles.link}>sajten</Link>.</Text>
    </Stack>}
    {error && <Stack gap={2}>
      <Text size="sm" role="alert">{error.message}</Text>
      {(!resource || error.status === 409) && <Inline><Button variant="secondary" disabled={busy} onClick={() => setRetry(value => value + 1)}>
        {resource ? "Hämta sparade brevval" : "Försök igen"}
      </Button></Inline>}
    </Stack>}
    <Inline gap={3}>
      <Button onClick={save} loading={busy} disabled={!resource || loading || error?.status === 409 || (!onContinue && !dirty)}>
        {onContinue ? dirty ? "Spara och fortsätt" : selected.length ? "Fortsätt" : "Fortsätt utan Morgonbrevet" : "Spara brevval"}
      </Button>
      {dirty && <Button variant="ghost" disabled={busy} onClick={() => { setSelected(resource.selected); setMessage(""); }}>Ångra ändringar</Button>}
      {onContinue && !dirty && (!resource || loading) && <Button variant="ghost" disabled={busy || loading} onClick={onContinue}>Välj brev senare</Button>}
    </Inline>
    {message && <Text size="sm" role="status">{message}</Text>}
  </Stack>;
}
