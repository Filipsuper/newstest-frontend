"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiCheckCircle } from "react-icons/fi";
import { confirmSubscription, fetchSubscriptionStatus } from "../utils/api";
import { useAuthContext } from "../providers/AuthProvider";
import PersonalizationSetup from "./PersonalizationSetup";
import EmailInput from "./EmailInput";
import LogInModal from "../modals/logInModal";
import { Button } from "./ui/Button";
import { Container, Heading, Stack, Text } from "./ui/layout";
import { Skeleton } from "./ui/data";
import styles from "./onboarding.module.css";

export default function ConfirmSubscriptionPage() {
  const token = useSearchParams().get("token");
  const { user, refreshUser } = useAuthContext();
  const [status, setStatus] = useState("loading");
  const [session, setSession] = useState("loading");
  const [email, setEmail] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [login, setLogin] = useState(false),
    [newLink, setNewLink] = useState(false);
  const request = useRef(null),
    confirmed = useRef(false);

  useEffect(() => {
    let active = true;
    if (!token && confirmed.current) return;
    async function run() {
      setStatus("loading");
      try {
        if (token) {
          // Reuse only an in-flight request during Strict Mode's effect replay.
          // Never persist the email token or put it in subsequent story URLs.
          if (
            request.current?.token !== token ||
            request.current?.attempt !== attempt
          ) {
            request.current = {
              token,
              attempt,
              promise: confirmSubscription(token),
            };
          }
          const result = await request.current.promise;
          if (!active) return;
          if (!result?.success) {
            setStatus(
              result?.code === "invalid_token" || result?.status === 400
                ? "invalid"
                : "error",
            );
            return;
          }
          confirmed.current = true;
          setEmail(result.mail || null);
          setStatus("confirmed");
          setSession("loading");
          window.history.replaceState(window.history.state, "", "/bekrafta");
          const account = await refreshUser();
          // replaceState updates search params; the token-less effect is a
          // no-op, so finish this already-confirmed session refresh normally.
          setSession(
            account?.email &&
              (!result.mail ||
                account.email.toLowerCase() === result.mail.toLowerCase())
              ? "ready"
              : "unavailable",
          );
          return;
        }
        const [result, account] = await Promise.all([
          fetchSubscriptionStatus(),
          refreshUser(),
        ]);
        if (!active) return;
        if (result.confirmed && result.subscribed && account?.email) {
          confirmed.current = true;
          setEmail(account.email);
          setSession("ready");
          setStatus("confirmed");
        } else
          setStatus(
            result.signedOut || !account?.email ? "signin" : "unconfirmed",
          );
      } catch {
        if (active) setStatus("error");
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [token, attempt, refreshUser]);

  async function retrySession() {
    setSession("loading");
    const account = await refreshUser();
    setSession(
      account?.email &&
        (!email || account.email.toLowerCase() === email.toLowerCase())
        ? "ready"
        : "unavailable",
    );
  }
  const canPersonalize =
    session === "ready" &&
    user?.email &&
    (!email || user.email.toLowerCase() === email.toLowerCase());
  return (
    <Container as="main" reading className={styles.page}>
      <Stack gap={8}>
        {status === "loading" ? (
          <Stack gap={4}>
            <Heading as="h1" size="page">
              {token
                ? "Bekräftar din prenumeration…"
                : "Hämtar din prenumeration…"}
            </Heading>
            <Skeleton />
          </Stack>
        ) : status === "confirmed" ? (
          <>
            <Stack gap={2}>
              <Text size="sm" role="status" className={styles.confirmed}>
                <FiCheckCircle aria-hidden="true" /> Din prenumeration är
                bekräftad.
              </Text>
              <Text size="sm" tone="secondary">
                Morgonbrevet skickas varje vardag kl. 08.00.
              </Text>
            </Stack>
            {canPersonalize ? (
              <PersonalizationSetup />
            ) : (
              <Stack gap={4}>
                <Heading as="h1" size="page">
                  Välkommen till OMXsum
                </Heading>
                {session === "loading" ? (
                  <Text role="status" size="sm">
                    Hämtar ditt konto…
                  </Text>
                ) : (
                  <>
                    <Text size="sm" tone="secondary">
                      Prenumerationen är klar, men ditt konto kunde inte öppnas.
                      Försök igen eller logga in för att välja bolag.
                    </Text>
                    <div className={styles.actions}>
                      <Button onClick={retrySession}>Försök igen</Button>
                      <Button
                        variant="secondary"
                        onClick={() => setLogin(true)}
                      >
                        Logga in
                      </Button>
                    </div>
                    {login && <LogInModal redirectTo="/bekrafta" />}
                  </>
                )}
                <Link href="/morgonbrevet" className={styles.link}>
                  Läs Morgonbrevet
                </Link>
              </Stack>
            )}
          </>
        ) : (
          <Stack gap={6}>
            <Stack gap={3}>
              <Heading as="h1" size="page">
                {status === "error"
                  ? "Det gick inte att slutföra just nu"
                  : status === "invalid"
                    ? "Länken kan inte användas"
                    : status === "unconfirmed"
                      ? "Bekräfta din prenumeration"
                      : "Fortsätt till din bevakning"}
              </Heading>
              <Text size="sm" tone="secondary">
                {status === "error"
                  ? "Vi kunde inte kontrollera prenumerationen. Försök igen; du behöver inte börja om."
                  : status === "invalid"
                    ? "Länken är ogiltig eller redan använd. Har du redan bekräftat? Logga in för att fortsätta."
                    : status === "unconfirmed"
                      ? "För att börja få Morgonbrevet behöver du bekräfta en prenumeration via din e-post."
                      : "Logga in för att fortsätta med dina bolag. Har du fått ett bekräftelsemejl? Öppna länken i mejlet."}
              </Text>
            </Stack>
            {status === "error" ? (
              <Button onClick={() => setAttempt((value) => value + 1)}>
                Försök igen
              </Button>
            ) : status === "unconfirmed" ? (
              <EmailInput />
            ) : (
              <>
                <LogInModal redirectTo="/bekrafta" />
                <Button
                  variant="ghost"
                  onClick={() => setNewLink((value) => !value)}
                  aria-expanded={newLink}
                >
                  Begär ett bekräftelsemejl
                </Button>
                {newLink && <EmailInput />}
              </>
            )}
            <Link href="/morgonbrevet" className={styles.link}>
              Läs Morgonbrevet
            </Link>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
