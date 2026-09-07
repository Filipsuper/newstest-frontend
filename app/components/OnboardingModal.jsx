"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FiMail } from "react-icons/fi";
import { addEmail } from "../utils/api";
import { Button } from "./ui/Button";
import { Stack, Text } from "./ui/layout";
import LogInModal from "../modals/logInModal";
import styles from "./onboarding.module.css";

export default function OnboardingModal({
  email,
  existing = false,
  retryAfter = 60,
  onEdit,
  onClose,
}) {
  const [until, setUntil] = useState(() => Date.now() + retryAfter * 1000);
  const [remaining, setRemaining] = useState(retryAfter);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [known, setKnown] = useState(existing),
    [login, setLogin] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    const update = () =>
      setRemaining(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [until]);
  async function resend() {
    if (pending.current || Date.now() < until) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await addEmail(email, "");
      setUntil(Date.now() + (response?.retryAfter || 60) * 1000);
      if (!response || response.error)
        setError(response?.msg || "Mejlet kunde inte skickas. Försök igen.");
      else if (response.alreadyVerified) setKnown(true);
      else setMessage("Bekräftelselänken har skickats igen.");
    } catch {
      setError("Kunde inte ansluta. Försök igen.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Stack gap={4}>
      {!known && <FiMail className={styles.mailIcon} aria-hidden="true" />}
      <Text size="sm" tone="secondary">
        {known
          ? "Morgonbrevet är redan aktiverat för"
          : "Bekräfta din e-postadress via länken vi skickat till"}{" "}
        <strong className={styles.email}>{email}</strong>.
      </Text>
      {!known && (
        <Text size="sm" tone="secondary">
          Hittar du inte mejlet? Kontrollera skräpposten.
        </Text>
      )}
      {error && (
        <Text size="sm" role="alert">
          {error}
        </Text>
      )}
      <Text size="sm" role="status">
        {message}
      </Text>
      {login ? (
        <LogInModal redirectTo="/bekrafta" />
      ) : (
        <div className={styles.actions}>
          {known ? (
            <Button onClick={() => setLogin(true)}>
              Logga in och fortsätt
            </Button>
          ) : (
            <Button onClick={onClose}>Fortsätt läsa</Button>
          )}
          <Button variant="ghost" onClick={onEdit}>
            Ändra e-postadress
          </Button>
        </div>
      )}
      {!known && (
        <Button
          variant="secondary"
          disabled={remaining > 0}
          loading={busy}
          onClick={resend}
        >
          {remaining > 0
            ? `Skicka igen om ${remaining} s`
            : "Skicka länken igen"}
        </Button>
      )}
      {known && (
        <Link className={styles.link} href="/morgonbrevet" onClick={onClose}>
          Läs Morgonbrevet
        </Link>
      )}
    </Stack>
  );
}
