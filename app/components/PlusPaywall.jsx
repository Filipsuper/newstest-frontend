"use client";
import Link from "next/link";
import { useState } from "react";
import { FiLock } from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import LogInModal from "../modals/logInModal";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/overlays";
import { Container, Heading, Inline, Stack, Text, Surface } from "./ui/layout";
import { Skeleton } from "./ui/data";

export default function PlusPaywall({
  children,
  redirectTo = "/",
  title = "Följ hela nyhetsflödet med Plus",
  description = "Löpande nyheter, sökning och kursreaktioner. Det publika urvalet på Marknaden och de dagliga breven är fortsatt öppna.",
}) {
  const { user, isGuestUser, isPlusUser } = useAuthContext();
  const [login, setLogin] = useState(false);
  if (!user) return <Skeleton />;
  if (isPlusUser) return children;
  return (
    <Container reading>
      <Surface>
        <Stack gap={4}>
          <FiLock aria-hidden="true" />
          <Heading>{title}</Heading>
          <Text size="sm" tone="secondary">
            {description}
          </Text>
          <Inline>
            <Button nativeButton={false} render={<Link href="/pro" />}>
              Se Plus & Pro
            </Button>
            <Button
              variant="secondary"
              nativeButton={false}
              render={<Link href="/marknaden" />}
            >
              Till marknadsöversikten
            </Button>
          </Inline>
          {isGuestUser && (
            <Button variant="ghost" onClick={() => setLogin(true)}>
              Har du redan Plus? Logga in
            </Button>
          )}
        </Stack>
      </Surface>
      <Dialog open={login} onOpenChange={setLogin} title="Logga in på OMXsum">
        <LogInModal redirectTo={redirectTo} />
      </Dialog>
    </Container>
  );
}
