"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "../providers/AuthProvider";
import EmailInput from "./EmailInput";
import { Button } from "./ui/Button";
import { Skeleton } from "./ui/data";
import { Inline, Stack, Text } from "./ui/layout";
import styles from "./landing.module.css";

export function LandingActions() {
  const { user } = useAuthContext();
  const hasPreferences = Boolean(
    user?.watchlist?.length || user?.topics?.length || user?.keywords?.length,
  );
  return (
    <Stack gap={4} className={styles.actions} id="kom-igang" tabIndex={-1}>
      {!user ? (
        <Stack gap={3} aria-busy="true">
          <Text size="sm" tone="secondary" role="status">
            Hämtar ditt konto…
          </Text>
          <Skeleton className={styles.actionSkeleton} />
        </Stack>
      ) : user.email ? (
        <>
          <Text size="sm" tone="secondary">
            Välkommen tillbaka
          </Text>
          <Inline gap={3}>
            <Button
              nativeButton={false}
              role="link"
              render={
                <Link href={hasPreferences ? "/bevakning" : "/marknaden"} />
              }
            >
              {hasPreferences ? "Öppna min bevakning" : "Öppna Marknaden"}
            </Button>
            <Button
              variant="secondary"
              nativeButton={false}
              role="link"
              render={
                <Link
                  href={hasPreferences ? "/marknaden" : "/bevakning/hantera"}
                />
              }
            >
              {hasPreferences ? "Till Marknaden" : "Välj bolag att följa"}
            </Button>
          </Inline>
        </>
      ) : (
        <>
          <Text size="sm">Börja med Morgonbrevet i inkorgen.</Text>
          <EmailInput />
          <Inline>
            <Button
              variant="secondary"
              nativeButton={false}
              role="link"
              render={<Link href="/marknaden" />}
            >
              Utforska Marknaden <span aria-hidden="true">→</span>
            </Button>
            <Text as="span" size="xs" tone="secondary">
              Öppet utan konto
            </Text>
          </Inline>
        </>
      )}
    </Stack>
  );
}

export function LetterSignup() {
  const { user } = useAuthContext();
  // An account is not proof of a newsletter subscription. Keep signup available
  // to signed-in readers too, without calling the mail-status API on the homepage.
  return user?.email ? (
    <EmailInput />
  ) : (
    <Inline>
      <Button nativeButton={false} role="link" render={<a href="#kom-igang" />}>
        Få Morgonbrevet gratis
      </Button>
    </Inline>
  );
}

export function LandingRetry() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      loading={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      Försök igen
    </Button>
  );
}
