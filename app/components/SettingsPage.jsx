"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthContext } from "../providers/AuthProvider";
import { saveActiveNewsletters, createPortalSession } from "../utils/api";
import { useTheme } from "../providers/ThemeProvider";
import LogInModal from "../modals/logInModal";
import { Button } from "./ui/Button";
import { Switch } from "./ui/Choices";
import { Dialog } from "./ui/overlays";
import { Label } from "./ui/Label";
import { Container, Heading, Inline, Stack, Text } from "./ui/layout";
import { EmptyState, Skeleton } from "./ui/data";
import styles from "./settings.module.css";

function AccountSettings({ user, refreshUser }) {
  const { theme, setTheme } = useTheme();
  const original = Array.isArray(user.active_newsletters)
    ? user.active_newsletters
    : [];
  const [selected, setSelected] = useState(original);
  const [saved, setSaved] = useState(original);
  const [busy, setBusy] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [error, setError] = useState("");
  const [portalError, setPortalError] = useState("");
  const [message, setMessage] = useState("");
  const changed =
    selected.length !== saved.length ||
    selected.some((value) => !saved.includes(value));
  const preferencesAvailable = Array.isArray(user.active_newsletters);
  useEffect(() => {
    if (Array.isArray(user.active_newsletters) && !changed && !busy) {
      setSelected(user.active_newsletters);
      setSaved(user.active_newsletters);
    }
  }, [user.active_newsletters, changed, busy]);
  const paid = user.plan === "plus" || user.plan === "premium";
  const plan =
    user.plan === "premium" ? "Pro" : user.plan === "plus" ? "Plus" : "Gratis";

  async function save(event) {
    event.preventDefault();
    if (busy || !changed || !preferencesAvailable) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await saveActiveNewsletters(selected);
      setSaved([...selected]);
      setMessage("Dina brevval har sparats.");
      await refreshUser();
    } catch {
      setError(
        "Brevvalen kunde inte sparas. Dina ändringar finns kvar – försök igen.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function manage() {
    if (portalBusy) return;
    setPortalBusy(true);
    setPortalError("");
    try {
      const response = await createPortalSession();
      const url = new URL(response?.url);
      if (url.protocol !== "https:" || url.hostname !== "billing.stripe.com")
        throw new Error("Invalid billing destination");
      window.location.assign(url.href);
    } catch {
      setPortalError("Prenumerationen kunde inte öppnas. Försök igen.");
      setPortalBusy(false);
    }
  }

  return (
    <Stack gap={12}>
      <section aria-labelledby="account-title" className={styles.section}>
        <Heading id="account-title" size="subsection">
          Ditt konto
        </Heading>
        <div className={styles.rows}>
          <div className={styles.row}>
            <Stack gap={1}>
              <Text size="sm">E-postadress</Text>
              <Text size="sm" tone="secondary" className={styles.email}>
                {user.email}
              </Text>
            </Stack>
            <Button
              variant="ghost"
              nativeButton={false}
              render={<a href="mailto:filipkarlberg1@gmail.com" />}
            >
              Kontakta oss
            </Button>
          </div>
          <div className={styles.row}>
            <Stack gap={1}>
              <Text size="sm">Din bevakning</Text>
              <Text size="sm" tone="secondary">
                Bolag, ämnen och nyckelord.
              </Text>
            </Stack>
            <Button
              variant="secondary"
              nativeButton={false}
              render={<Link href="/bevakning/hantera" />}
            >
              Hantera bevakning →
            </Button>
          </div>
        </div>
      </section>
      <section aria-labelledby="appearance-title" className={styles.section}>
        <Heading id="appearance-title" size="subsection">
          Utseende
        </Heading>
        <div className={styles.rows}>
          <Switch
            className={styles.switchRow}
            label="Mörkt läge"
            description="Sparas i den här webbläsaren."
            checked={theme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        </div>
      </section>
      <section aria-labelledby="plan-title" className={styles.section}>
        <Heading id="plan-title" size="subsection">
          Prenumeration
        </Heading>
        <div className={styles.rows}>
          <div className={styles.row}>
            <Inline gap={3}>
              <Text size="sm">Din plan</Text>
              <Label tone={paid ? "accent" : "neutral"}>{plan}</Label>
            </Inline>
            {paid ? (
              <Button variant="secondary" loading={portalBusy} onClick={manage}>
                Hantera prenumeration ↗
              </Button>
            ) : (
              <Button nativeButton={false} render={<Link href="/pro" />}>
                Se Plus och Pro →
              </Button>
            )}
          </div>
        </div>
        {portalError && (
          <Text size="sm" role="alert">
            {portalError}
          </Text>
        )}
      </section>
      <section aria-labelledby="letters-title" className={styles.section}>
        <Heading id="letters-title" size="subsection">
          Nyhetsbrev i mejlen
        </Heading>
        <Stack as="form" gap={4} onSubmit={save}>
          <div className={styles.rows}>
            <Switch
              className={styles.switchRow}
              label="Morgonbrevet"
              description="Börsnyheter och sammanhang varje vardag."
              checked={selected.includes("Morgonbrev")}
              disabled={busy || !preferencesAvailable}
              onCheckedChange={(checked) => {
                setSelected((previous) =>
                  checked
                    ? [...previous, "Morgonbrev"]
                    : previous.filter((value) => value !== "Morgonbrev"),
                );
                setMessage("");
              }}
            />
            <div className={styles.row}>
              <Stack gap={1}>
                <Text size="sm">Kvällsbrevet</Text>
                <Text size="sm" tone="secondary">
                  Publiceras på sajten efter börsens stängning.
                </Text>
              </Stack>
              <Button
                variant="ghost"
                nativeButton={false}
                render={<Link href="/kvallsbrevet" />}
              >
                Läs brevet →
              </Button>
            </div>
          </div>
          <Inline gap={3}>
            <Button
              type="submit"
              disabled={!changed || !preferencesAvailable}
              loading={busy}
            >
              Spara brevval
            </Button>
            {changed && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setSelected([...saved]);
                  setError("");
                  setMessage("");
                }}
              >
                Ångra ändringar
              </Button>
            )}
            <Text size="sm" tone="secondary" role="status">
              {busy ? "Sparar…" : changed ? "Osparade ändringar" : message}
            </Text>
          </Inline>
          {error && (
            <Text size="sm" role="alert">
              {error}
            </Text>
          )}
          {!preferencesAvailable && (
            <Inline gap={3}>
              <Text size="sm" role="alert">
                Brevvalen kunde inte hämtas.
              </Text>
              <Button variant="secondary" onClick={refreshUser}>
                Hämta brevval igen
              </Button>
            </Inline>
          )}
        </Stack>
      </section>
      <Text size="sm" tone="secondary">
        Vill du ändra din e-postadress eller ta bort kontot?{" "}
        <a className={styles.link} href="mailto:filipkarlberg1@gmail.com">
          Kontakta oss
        </a>
        .
      </Text>
    </Stack>
  );
}

export default function SettingsPage() {
  const { user, isGuestUser, refreshUser } = useAuthContext();
  return (
    <Container as="main" reading className={styles.page}>
      <header className={styles.header}>
        <Heading as="h1" size="page">
          Inställningar
        </Heading>
      </header>
      {!user ? (
        <Stack gap={6} aria-label="Hämtar dina inställningar" aria-busy="true">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </Stack>
      ) : isGuestUser ? (
        <EmptyState
          title="Dina inställningar, samlade"
          description="Logga in för att hantera konto och brev."
          action={
            <Dialog title="Logga in" trigger={<Button>Logga in</Button>}>
              <LogInModal redirectTo="/settings" />
            </Dialog>
          }
        />
      ) : (
        <AccountSettings
          key={user.email}
          user={user}
          refreshUser={refreshUser}
        />
      )}
    </Container>
  );
}
