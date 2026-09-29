"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { FiCheck } from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import { createCheckoutSession } from "../utils/api";
import {
  membershipPlans,
  memberPlan,
  checkoutDestination,
} from "../utils/membership";
import LogInModal from "../modals/logInModal";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/overlays";
import { Badge } from "./ui/data";
import { Label } from "./ui/Label";
import { Container, Heading, Inline, Stack, Surface, Text } from "./ui/layout";
import styles from "./membership.module.css";
import MembershipTrial from "./MembershipTrial";

export default function ProPage() {
  const { user } = useAuthContext();
  const plan = memberPlan(user);
  const trialActive = user?.trial?.status === "active";
  const paid = !trialActive && (plan === "plus" || plan === "pro");
  const [loginTier, setLoginTier] = useState(null);
  const loginTrigger = useRef(null);
  const checkoutPending = useRef(false);
  const [loadingTier, setLoadingTier] = useState(null);
  const [error, setError] = useState(null);

  async function upgrade(tier, trigger) {
    if (!user || paid || checkoutPending.current) return;
    setError(null);
    if (!user.email) {
      loginTrigger.current = trigger;
      setLoginTier(tier);
      return;
    }
    checkoutPending.current = true;
    setLoadingTier(tier.id);
    try {
      const response = await createCheckoutSession(tier.id);
      window.location.assign(checkoutDestination(response));
    } catch {
      setError({
        tier: tier.id,
        message: "Kassan kunde inte öppnas. Försök igen.",
      });
      checkoutPending.current = false;
      setLoadingTier(null);
    }
  }

  return (
    <Container as="main" className={styles.page}>
      <Stack gap={8}>
        <header className={styles.header}>
          <Stack gap={3}>
            <Inline>
              <Label tone="accent">Medlemskap</Label>
            </Inline>
            <Heading as="h1" size="page">
              Från börskoll till din egen arbetsyta
            </Heading>
            <Text tone="secondary" className={styles.intro}>
              Börja gratis med två bolag. Plus samlar nyheter, bevakning och
              lättöverskådlig bolagsanalys. Pro ger dig dessutom Terminal.
            </Text>
          </Stack>
          <Stack gap={2} className={styles.account}>
            <Text size="sm" tone="secondary" role="status">
              {!user
                ? "Hämtar din plan…"
                : plan
                  ? `Din plan: ${membershipPlans.find((tier) => tier.id === plan).name}`
                  : "Har du redan ett konto?"}
            </Text>
            {paid ? (
              <Button
                variant="secondary"
                nativeButton={false}
                role="link"
                render={<Link href="/settings" />}
              >
                Hantera prenumeration
              </Button>
            ) : user && !user.email ? (
              <Button
                variant="secondary"
                onClick={(event) => {
                  loginTrigger.current = event.currentTarget;
                  setLoginTier({ name: "", id: "login" });
                }}
              >
                Logga in
              </Button>
            ) : null}
          </Stack>
        </header>

        <MembershipTrial />
        {trialActive && <Text size="sm" tone="secondary">Provperioden avslutas automatiskt. Om du väljer en betalplan nedan börjar prenumerationen direkt när du slutför köpet.</Text>}
        <section aria-label="Jämför medlemskap" className={styles.plans}>
          {membershipPlans.map((tier) => {
            const current = !trialActive && plan === tier.id;
            const included =
              (paid && tier.id === "free") ||
              (paid && plan === "pro" && tier.id === "plus");
            return (
              <Surface
                as="section"
                key={tier.id}
                aria-labelledby={`plan-${tier.id}`}
                className={styles.plan}
              >
                <Inline className={styles.planTitle} gap={2}>
                  <Heading id={`plan-${tier.id}`} size="subsection">
                    {tier.name}
                  </Heading>
                  {current ? (
                    <Badge>Din plan</Badge>
                  ) : tier.id === "plus" ? (
                    <Label tone="accent">Nyheter & analys</Label>
                  ) : null}
                </Inline>
                <Inline gap={1} className={styles.price}>
                  <span>{tier.price} kr</span>
                  <Text as="span" size="sm" tone="secondary">
                    /mån
                  </Text>
                </Inline>
                <Text
                  size="sm"
                  tone="secondary"
                  className={styles.planDescription}
                >
                  {tier.description}
                </Text>
                <ul className={styles.features}>
                  {tier.features.map((feature) => (
                    <li key={feature}>
                      <FiCheck aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Stack gap={3}>
                  {tier.id === "free" ? (
                    <Button
                      variant="secondary"
                      nativeButton={false}
                      role="link"
                      render={<Link href="/marknaden" />}
                    >
                      Öppna Marknaden
                    </Button>
                  ) : current || included ? (
                    <Button variant="secondary" disabled>
                      {current ? "Din nuvarande plan" : "Ingår i Pro"}
                    </Button>
                  ) : paid ? (
                    <Button
                      variant="secondary"
                      nativeButton={false}
                      role="link"
                      render={<Link href="/settings" />}
                    >
                      Hantera din plan
                    </Button>
                  ) : (
                    <Button
                      variant={tier.id === "plus" ? "primary" : "secondary"}
                      disabled={!user || Boolean(loadingTier)}
                      loading={loadingTier === tier.id}
                      onClick={(event) => upgrade(tier, event.currentTarget)}
                    >
                      {loadingTier === tier.id
                        ? "Öppnar kassan…"
                        : `Välj ${tier.name}`}
                    </Button>
                  )}
                  {paid && tier.id === "pro" && !current && (
                    <Text size="xs" tone="secondary">
                      Hantera din befintliga prenumeration i inställningarna.
                    </Text>
                  )}
                  {error?.tier === tier.id && (
                    <Text size="sm" role="alert" className={styles.error}>
                      {error.message}
                    </Text>
                  )}
                </Stack>
              </Surface>
            );
          })}
        </section>

        <Text size="sm" tone="secondary">
          Plus och Pro betalas månadsvis via Stripe. Avsluta i inställningarna
          när du vill.
        </Text>

        <section aria-labelledby="membership-questions">
          <Stack gap={6}>
            <Heading id="membership-questions" size="subsection">
              Bra att veta
            </Heading>
            <div className={styles.questions}>
              <Stack gap={2}>
                <Heading as="h3" size="subsection">
                  Vad är fortfarande gratis?
                </Heading>
                <Text size="sm" tone="secondary">
                  Morgon- och kvällsbreven, Marknadens nyhetsurval och
                  aktieöversikterna. Med ett konto kan du följa två bolag och se
                  nyheter som matchar dina bolag, ämnen och nyckelord i Mina bolag.
                </Text>
              </Stack>
              <Stack gap={2}>
                <Heading as="h3" size="subsection">
                  Vad skiljer Plus från Pro?
                </Heading>
                <Text size="sm" tone="secondary">
                  Plus innehåller hela nyhetsflödet, screenern, finansiella
                  grafer, VD-ord och fördjupad bolagsanalys. Du kan följa upp till
                  20 bolag i Mina bolag. Pro innehåller allt i Plus, upp till 100 följda
                  bolag och exklusiv tillgång till Terminal.
                </Text>
              </Stack>
              <Stack gap={2}>
                <Heading as="h3" size="subsection">Finns all data för alla bolag?</Heading>
                <Text size="sm" tone="secondary">
                  Underlaget varierar mellan bolag och marknader. Finansiell
                  historik, VD-ord, estimat, insyn, blankning och kursreaktioner
                  visas när data finns. Källor och perioder finns vid uppgifterna.
                </Text>
              </Stack>
              <Stack gap={2}>
                <Heading as="h3" size="subsection">
                  Får jag mejl om bolagen jag följer?
                </Heading>
                <Text size="sm" tone="secondary">
                  Bevakning samlar dina nyheter på sajten. Med Plus eller Pro
                  får Morgonbrevet också en personlig del när nyheter matchar
                  dina val. Att följa ett bolag aktiverar inte nyhetslarm.
                </Text>
              </Stack>
            </div>
          </Stack>
        </section>
      </Stack>
      <Dialog
        open={Boolean(loginTier)}
        onOpenChange={(open) => {
          if (!open) setLoginTier(null);
        }}
        title={
          loginTier?.id === "login"
            ? "Logga in på OMXsum"
            : `Logga in för att välja ${loginTier?.name || "plan"}`
        }
        description="Du väljer plan och bekräftar betalningen efter inloggning."
        finalFocus={loginTrigger}
      >
        <LogInModal redirectTo="/pro" />
      </Dialog>
    </Container>
  );
}
