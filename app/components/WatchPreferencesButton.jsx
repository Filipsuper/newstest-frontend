"use client";

import { FiSliders } from "react-icons/fi";
import WatchPreferencesEditor from "./WatchPreferencesEditor";
import { Button } from "./ui/Button";
import { Dialog, DialogClose } from "./ui/overlays";
import styles from "./watch-preferences.module.css";

export default function WatchPreferencesButton({
  children = "Anpassa bevakning",
  variant = "secondary",
  initialTab = "companies",
  ...buttonProps
}) {
  return (
    <Dialog
      title="Anpassa bevakning"
      className={styles.dialog}
      trigger={
        <Button variant={variant} {...buttonProps}>
          <FiSliders aria-hidden="true" />
          {children}
        </Button>
      }
      footer={<DialogClose render={<Button variant="secondary" />}>Klart</DialogClose>}
    >
      <WatchPreferencesEditor initialTab={initialTab} />
    </Dialog>
  );
}
