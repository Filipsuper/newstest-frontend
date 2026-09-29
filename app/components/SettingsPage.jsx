"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthContext } from "../providers/AuthProvider";
import { createPortalSession } from "../utils/api";
import NewsletterPreferences from "./NewsletterPreferences";
import { useTheme } from "../providers/ThemeProvider";
import LogInModal from "../modals/logInModal";
import WatchPreferencesButton from "./WatchPreferencesButton";
import { companyAlertsEnabled } from "../utils/companyAlerts";
import { Button } from "./ui/Button";
import { Switch } from "./ui/Choices";
import { Dialog } from "./ui/overlays";
import { Label } from "./ui/Label";
import { Container, Heading, Inline, Stack, Text } from "./ui/layout";
import { EmptyState, Skeleton } from "./ui/data";
import styles from "./settings.module.css";
import { TrialStatus } from "./MembershipTrial";

function AccountSettings({ user }) {
  const { theme, setTheme } = useTheme();
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalError, setPortalError] = useState("");
  const paid = user.plan === "plus" || user.plan === "premium";
  const plan =
    user.plan === "premium" ? "Pro" : user.plan === "plus" ? "Plus" : "Gratis";

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
              <Text size="sm">Mina bolag</Text>
              <Text size="sm" tone="secondary">
                Bolag, ämnen och nyckelord.
              </Text>
            </Stack>
            <Button
              variant="secondary"
              nativeButton={false}
              render={<Link href="/marknaden/bevakning/hantera" />}
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
            {paid && user.trial?.status !== "active" ? (
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
        <TrialStatus trial={user.trial} />
        {user.trial?.status === "expired" && !paid && <Text size="sm" tone="secondary">Provperioden är slut. Du använder Gratis och dina följda bolag finns kvar.</Text>}
        {portalError && (
          <Text size="sm" role="alert">
            {portalError}
          </Text>
        )}
      </section>
      <section id="letters" aria-labelledby="letters-title" className={styles.section}>
        <Heading id="letters-title" size="subsection">
          Nyhetsbrev i mejlen
        </Heading>
        <NewsletterPreferences key={user.email} />
      </section>
      {companyAlertsEnabled() && <section id="company-email" aria-labelledby="company-email-title" className={styles.section}>
        <Heading id="company-email-title" size="subsection">Mejl från bevakningen</Heading>
        <Text size="sm" tone="secondary">Hantera nyhetsnivå, bolagsval och tysta timmar tillsammans med det du följer. Morgonbrevet har sitt eget val ovan.</Text>
        <Inline><WatchPreferencesButton initialSection="email">Hantera mejl från bevakningen</WatchPreferencesButton></Inline>
      </section>}
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
