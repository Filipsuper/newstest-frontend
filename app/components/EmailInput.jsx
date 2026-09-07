"use client";

import { useEffect, useRef, useState } from "react";
import { addEmail } from "../utils/api";
import OnboardingModal from "./OnboardingModal";
import { Button } from "./ui/Button";
import { TextField } from "./ui/TextField";
import { Dialog } from "./ui/overlays";
import { Stack, Text } from "./ui/layout";
import styles from "./onboarding.module.css";

export default function EmailInput() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [retryAt, setRetryAt] = useState(0),
    [remaining, setRemaining] = useState(0);
  const input = useRef(null),
    pending = useRef(false);
  useEffect(() => {
    const update = () =>
      setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    update();
    if (!retryAt) return;
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  async function submit(event) {
    event.preventDefault();
    if (pending.current || Date.now() < retryAt) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const address = email.trim().toLowerCase();
    try {
      const response = await addEmail(
        address,
        new FormData(event.currentTarget).get("website"),
      );
      if (!response || response.error) {
        if (response?.retryAfter)
          setRetryAt(Date.now() + response.retryAfter * 1000);
        setError(response?.msg || "Mejlet kunde inte skickas. Försök igen.");
        return;
      }
      setEmail(address);
      setResult({
        email: address,
        existing: response.alreadyVerified === true,
        retryAfter: response.retryAfter || 60,
      });
      window.sa_event?.("click_email_signup");
    } catch {
      setError("Kunde inte ansluta. Försök igen om en stund.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Stack gap={2} className={styles.signup}>
      <form className={styles.form} onSubmit={submit}>
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          hidden
        />
        <TextField
          className={styles.field}
          inputRef={input}
          label="E-postadress"
          hideLabel
          type="email"
          name="mail"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={254}
          value={email}
          onValueChange={setEmail}
          placeholder="Din e-postadress"
          error={error}
          disabled={busy}
        />
        <Button type="submit" loading={busy} disabled={remaining > 0}>
          {remaining > 0 ? `Försök igen om ${remaining} s` : "Prenumerera"}
        </Button>
      </form>
      <Text size="xs" tone="secondary">
        Morgonbrevet är gratis. Avsluta när du vill.
      </Text>
      <Dialog
        open={Boolean(result)}
        onOpenChange={(open) => {
          if (!open) setResult(null);
        }}
        title={result?.existing ? "Du prenumererar redan" : "Kolla din inkorg"}
        finalFocus={input}
      >
        {result && (
          <OnboardingModal
            {...result}
            onEdit={() => setResult(null)}
            onClose={() => setResult(null)}
          />
        )}
      </Dialog>
    </Stack>
  );
}
