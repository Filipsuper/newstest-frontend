"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiCheck, FiPlus } from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import { setCompanyFollowing } from "../utils/api";
import { onboardingHref } from "../utils/onboarding";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/overlays";
import { Text } from "./ui/layout";
import LogInModal from "../modals/logInModal";

export default function FollowCompanyButton({ symbol, name, size = "sm" }) {
  const { user, isGuestUser, refreshUser, accountLoading } = useAuthContext();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [login, setLogin] = useState(null);
  const [justFollowed, setJustFollowed] = useState(false);
  const followed = (user?.watchlist ?? []).includes(symbol);
  if (!symbol) return null;
  async function toggle() {
    if (busy || (!user && accountLoading)) return;
    if (!user || isGuestUser) {
      setLogin(onboardingHref({ company: symbol, returnTo: `${pathname}${window.location.search}${window.location.hash}` }));
      return;
    }
    setBusy(true);
    setError("");
    setJustFollowed(false);
    try {
      const result = await setCompanyFollowing(symbol, !followed);
      if (!result || result.error)
        throw new Error(
          typeof result?.error === "string"
            ? result.error
            : "Kunde inte spara bevakningen.",
        );
      await refreshUser();
      setJustFollowed(!followed);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant="secondary"
        size={size}
        loading={busy || (!user && accountLoading)}
        onClick={toggle}
        aria-pressed={followed}
        aria-label={`${followed ? "Sluta följa" : "Följ"} ${name || symbol}`}
      >
        {followed ? (
          <FiCheck aria-hidden="true" />
        ) : (
          <FiPlus aria-hidden="true" />
        )}
        {followed ? "Följer" : "Följ bolag"}
      </Button>
      {justFollowed && followed && <Text as="span" size="xs" tone="secondary" role="status">
        Nyheterna samlas i <Link href="/marknaden/bevakning">Mina bolag</Link>.
      </Text>}
      {error && (
        <Text as="span" size="xs" role="alert">
          {error} <Link href="/marknaden/bevakning/hantera">Hantera bevakning</Link>
        </Text>
      )}
      <Dialog open={Boolean(login)} onOpenChange={open => { if (!open) setLogin(null); }} title="Följ dina bolag">
        <LogInModal createAccount redirectTo={login || pathname} />
      </Dialog>
    </>
  );
}
