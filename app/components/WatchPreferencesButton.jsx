"use client";

import { FiSliders } from "react-icons/fi";
import { useState } from "react";
import WatchPreferencesEditor from "./WatchPreferencesEditor";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/overlays";
import { Text } from "./ui/layout";
import styles from "./watch-preferences.module.css";

export default function WatchPreferencesButton({
  children = "Anpassa bevakning",
  variant = "secondary",
  initialTab = "companies",
  initialSection,
  icon = <FiSliders aria-hidden="true" />,
  ...buttonProps
}) {
  const [open, setOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [emailState, setEmailState] = useState({ dirty: false, busy: false });
  function requestOpen(nextOpen) {
    if (!nextOpen && emailState.busy) return;
    if (!nextOpen && emailState.dirty) { setConfirmClose(true); return; }
    setOpen(nextOpen);
  }
  return (
    <Dialog
      open={open} onOpenChange={requestOpen}
      title="Anpassa bevakning"
      className={styles.dialog}
      trigger={
        <Button variant={variant} {...buttonProps}>
          {icon}
          {children}
        </Button>
      }
      footer={<Button variant="secondary" disabled={emailState.busy} onClick={() => requestOpen(false)}>Stäng</Button>}
    >
      <WatchPreferencesEditor initialTab={initialTab} initialSection={initialSection} onEmailStateChange={setEmailState} />
      <Dialog open={confirmClose} onOpenChange={setConfirmClose} title="Osparade mejlval"
        description="Bolag, ämnen och nyckelord är redan sparade. Dina mejländringar är inte sparade."
        footer={<>
          <Button onClick={() => setConfirmClose(false)}>Fortsätt redigera</Button>
          <Button variant="secondary" onClick={() => { setConfirmClose(false); setOpen(false); }}>Kasta mejländringar</Button>
        </>}>
        <Text size="sm">Fortsätt redigera för att spara mejlvalen, eller stäng utan att spara dem.</Text>
      </Dialog>
    </Dialog>
  );
}
