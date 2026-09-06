"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiCheck, FiPlus } from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import { toggleWatchlist } from "../utils/api";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/overlays";
import { Text } from "./ui/layout";
import LogInModal from "../modals/logInModal";

export default function FollowCompanyButton({ symbol, name, size = "sm" }) {
  const { user, isGuestUser, refreshUser } = useAuthContext();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [login, setLogin] = useState(false);
  const followed = (user?.watchlist ?? []).includes(symbol);
  if (!symbol) return null;
  async function toggle() {
    if (busy) return;
    if (!user || isGuestUser) {
      setLogin(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await toggleWatchlist(symbol);
      if (!result || result.error)
        throw new Error(
          typeof result?.error === "string"
            ? result.error
            : "Kunde inte spara bevakningen.",
        );
      await refreshUser();
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
        loading={busy}
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
      {error && (
        <Text as="span" size="xs" role="alert">
          {error} <Link href="/bevakning/hantera">Hantera bevakning</Link>
        </Text>
      )}
      <Dialog open={login} onOpenChange={setLogin} title="Spara din bevakning">
        <LogInModal redirectTo={pathname} />
      </Dialog>
    </>
  );
}
