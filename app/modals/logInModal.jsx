"use client";
import { useEffect, useRef, useState } from "react";
import { signUp } from "../utils/api";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import { Heading, Inline, Stack, Text } from "../components/ui/layout";

export default function LogInModal({ redirectTo = "/", initialEmail = "", createAccount = false }) {
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [sent, setSent] = useState(false);
  const emailField = useRef(null);
  const pending = useRef(false);
  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(() => setRemaining(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);
  async function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    if (pending.current || remaining) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const address = email.trim().toLowerCase();
      const response = await signUp(address, redirectTo);
      if (response?.retryAfter) setRemaining(response.retryAfter);
      if (!response || response.error)
        throw new Error(
          response?.message || "Inloggningen kunde inte startas.",
        );
      if (response.devLoginUrl) {
        window.location.assign(response.devLoginUrl);
        return;
      }
      setEmail(address);
      setMessage(`Öppna länken vi skickat till ${address} för att fortsätta. Kontrollera skräpposten om mejlet saknas.`);
      setSent(true);
      setRemaining(60);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
      pending.current = false;
    }
  }
  if (createAccount && sent) return <Stack as="form" gap={4} onSubmit={submit}>
    <Heading size="section">Kolla din inkorg</Heading>
    <Text size="sm" role="status">{message || "Skickar en ny länk…"}</Text>
    {error && <Text size="sm" role="alert">{error}</Text>}
    <Inline gap={3}>
      <Button type="submit" loading={busy} disabled={remaining > 0}>{remaining ? `Skicka igen om ${remaining} s` : "Skicka länken igen"}</Button>
      <Button variant="ghost" disabled={busy} onClick={() => {
        setSent(false); setMessage(""); setError("");
        requestAnimationFrame(() => emailField.current?.focus());
      }}>Ändra e-postadress</Button>
    </Inline>
  </Stack>;
  return (
    <Stack as="form" gap={4} onSubmit={submit}>
      <Text size="sm" tone="secondary">
        {createAccount ? "Inget lösenord behövs. Du får en länk till din e-post för att fortsätta." : "Logga in med en länk till din e-post. Har du inget konto skapas ett gratis."}
      </Text>
      <TextField
        label="E-postadress"
        type="email"
        required
        autoComplete="email"
        value={email}
        disabled={busy}
        onValueChange={setEmail}
        error={error}
        placeholder="namn@exempel.se"
        inputRef={emailField}
      />
      <Button type="submit" loading={busy} disabled={remaining > 0}>
        {remaining ? `Skicka igen om ${remaining} s` : createAccount ? "Fortsätt med e-post" : "Skicka inloggningslänk"}
      </Button>
      <Text size="xs" tone="secondary">Du väljer nyhetsbrev och mejlbevakning separat. Inga utskick aktiveras när du skapar konto.</Text>
      {message && (
        <Text size="sm" role="status">
          {message}
        </Text>
      )}
    </Stack>
  );
}
