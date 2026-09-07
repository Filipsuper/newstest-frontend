"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FiArrowRight, FiCheck } from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import { membershipPlans } from "../utils/membership";
import LogInModal from "../modals/logInModal";
import { Button } from "./ui/Button";
import { Label } from "./ui/Label";
import { Dialog } from "./ui/overlays";
import { Container, Heading, Inline, Stack, Surface, Text } from "./ui/layout";
import TerminalShowcase from "./TerminalShowcase";
import styles from "./terminal-gateway.module.css";

const plus = membershipPlans.find((plan) => plan.id === "plus");
const sessionUrl = "/api/auth/terminal-session";

export default function TerminalGateway() {
  const { user, isGuestUser, isPlusUser } = useAuthContext();

  useEffect(() => {
    if (isPlusUser) window.location.replace(sessionUrl);
  }, [isPlusUser]);

  if (!user || isPlusUser) {
    return (
      <Container as="main" reading className={styles.page}>
        <Stack gap={4} className={styles.pending}>
          <Heading as="h1" size="page">
            OMXsum Terminal
          </Heading>
          <Text tone="secondary" role="status">
            {isPlusUser
              ? "Öppnar OMXsum Terminal…"
              : "Kontrollerar din åtkomst…"}
          </Text>
          {isPlusUser && (
            <Inline>
              <Button
                variant="secondary"
                nativeButton={false}
                role="link"
                render={<a href={sessionUrl} />}
              >
                Öppna Terminal <FiArrowRight aria-hidden="true" />
              </Button>
            </Inline>
          )}
        </Stack>
      </Container>
    );
  }

  return (
    <Container as="main" className={styles.page}>
      <Stack gap={12}>
        <div className={styles.hero}>
          <header className={styles.intro}>
            <Stack gap={4}>
              <Inline>
                <Label tone="accent">OMXsum Terminal</Label>
              </Inline>
              <Heading as="h1" size="page">
                Nyheter och kursrörelser i samma arbetsyta
              </Heading>
              <Text tone="secondary">
                För dig som vill följa börsen på djupet. Läs nyheterna, hitta
                bolag med ovanlig aktivitet och undersök kursrörelsen utan att
                lämna din arbetsyta.
              </Text>
              <Inline>
                <Button
                  variant="ghost"
                  nativeButton={false}
                  role="link"
                  render={<Link href="/marknaden" />}
                >
                  Till den fria marknadsöversikten{" "}
                  <FiArrowRight aria-hidden="true" />
                </Button>
              </Inline>
            </Stack>
          </header>

          <Surface
            as="section"
            aria-labelledby="terminal-access"
            className={styles.access}
          >
            <Stack gap={4}>
              <Heading id="terminal-access" size="subsection">
                Terminal ingår i Plus
              </Heading>
              <Inline gap={1} className={styles.price}>
                <Text as="span" numeric className={styles.amount}>
                  {plus.price} kr
                </Text>
                <Text as="span" size="sm" tone="secondary">
                  /mån
                </Text>
              </Inline>
              <Text size="sm" tone="secondary">
                Ingår också i Pro. Du får även Plus-funktionerna på vanliga
                OMXsum.
              </Text>
              <ul className={styles.included}>
                {[
                  "Hela nyhetsflödet och sökning",
                  "Movers och intradagsscreener",
                  "Grafer och bolagsdata sida vid sida",
                ].map((feature) => (
                  <li key={feature}>
                    <FiCheck aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button nativeButton={false} role="link" render={<Link href="/pro" />}>
                Se Plus & Pro <FiArrowRight aria-hidden="true" />
              </Button>
              {isGuestUser && (
                <Dialog
                  title="Logga in för att öppna Terminal"
                  trigger={
                    <Button variant="secondary">
                      Har du redan Plus? Logga in
                    </Button>
                  }
                >
                  <LogInModal redirectTo="/terminal" />
                </Dialog>
              )}
            </Stack>
          </Surface>
        </div>
        <TerminalShowcase />
      </Stack>
    </Container>
  );
}
