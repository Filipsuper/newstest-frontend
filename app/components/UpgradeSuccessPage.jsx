"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FiCheckCircle } from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import { memberPlan } from "../utils/membership";
import LogInModal from "../modals/logInModal";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/overlays";
import { Label } from "./ui/Label";
import { Container, Heading, Inline, Stack, Text } from "./ui/layout";
import styles from "./membership.module.css";

export default function UpgradeSuccessPage() {
  const { user, refreshUser } = useAuthContext();
  const plan = memberPlan(user);
  const active = plan === "plus" || plan === "pro";
  const planName = plan === "pro" ? "Pro" : "Plus";
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refreshing = useRef(false);
  const [login, setLogin] = useState(false);

  // The return URL is not proof of payment. Only show access actually returned
  // by the account endpoint. Webhook delays get bounded polling and a retry.
  useEffect(() => {
    if (!user?.email || active) return;
    let cancelled = false;
    const timers = [1000, 3000, 7000].map((ms, index) =>
      setTimeout(async () => {
        if (cancelled) return;
        await refreshUser();
        if (!cancelled && index === 2) setChecked(true);
      }, ms),
    );
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [user?.email, active, refreshUser]);

  async function checkAgain() {
    if (refreshing.current) return;
    refreshing.current = true;
    setBusy(true);
    setError("");
    const account = await refreshUser();
    setChecked(true);
    if (!account)
      setError(
        "Kontot kunde inte verifieras. Försök igen eller logga in på nytt.",
      );
    refreshing.current = false;
    setBusy(false);
  }

  return (
    <Container as="main" reading className={styles.page}>
      <Stack gap={8}>
        <Stack as="header" gap={4}>
          <Inline gap={3}>
            {active && (
              <FiCheckCircle aria-hidden="true" className={styles.statusIcon} />
            )}
            <Label tone="accent">{active ? planName : "Prenumeration"}</Label>
          </Inline>
          <Heading as="h1" size="page">
            {active
              ? "Din plan är redo"
              : !user
                ? "Hämtar ditt konto…"
                : !user.email
                  ? "Kontrollera din prenumeration"
                  : checked
                    ? "Din plan har inte uppdaterats än"
                    : "Kontrollerar din plan…"}
          </Heading>
          <Text tone="secondary" role="status">
            {active
              ? `${planName} är aktivt på ditt konto. Hela nyhetsflödet, din bevakning och bolagsanalysen finns på samma plats som tidigare.`
              : !user
                ? "Vi hämtar din aktuella tillgång."
                : !user.email
                  ? "Logga in med kontot du använde i kassan för att se din aktuella plan."
                  : "Vi kan inte se en aktiv Plus- eller Pro-plan ännu. Om du har slutfört betalningen kan uppdateringen dröja. Starta inte ett nytt köp."}
          </Text>
        </Stack>
        <Stack gap={3} className={styles.statusActions}>
          {active ? (
            <>
              <Button
                nativeButton={false}
                role="link"
                render={<Link href="/marknaden/nyheter" />}
              >
                Öppna nyhetsflödet
              </Button>
              <Button
                variant="secondary"
                nativeButton={false}
                role="link"
                render={<Link href="/bevakning/hantera" />}
              >
                Välj bolag att följa
              </Button>
              <Button
                variant="ghost"
                nativeButton={false}
                role="link"
                render={<Link href="/settings" />}
              >
                Hantera prenumeration
              </Button>
            </>
          ) : (
            <>
              {user && !user.email && (
                <Dialog
                  open={login}
                  onOpenChange={setLogin}
                  title="Logga in på OMXsum"
                  trigger={<Button>Logga in</Button>}
                >
                  <LogInModal redirectTo="/pro/klart" />
                </Dialog>
              )}
              <Button
                variant="secondary"
                disabled={!user}
                loading={busy}
                onClick={checkAgain}
              >
                Kontrollera igen
              </Button>
              <Button
                variant="ghost"
                nativeButton={false}
                role="link"
                render={<Link href="/marknaden" />}
              >
                Till Marknaden
              </Button>
            </>
          )}
          {error && !active && (
            <Text role="alert" size="sm" className={styles.error}>
              {error}
            </Text>
          )}
        </Stack>
        {!active && user && (
          <Text size="sm" tone="secondary">
            Fortfarande fel plan efter betalning?{" "}
            <a className={styles.link} href="mailto:filipkarlberg1@gmail.com">
              Kontakta oss
            </a>{" "}
            så hjälper vi dig.
          </Text>
        )}
      </Stack>
    </Container>
  );
}
