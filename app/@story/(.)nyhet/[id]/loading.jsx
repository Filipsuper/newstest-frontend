"use client";
import { useRouter } from "next/navigation";
import { Dialog } from "../../../components/ui/overlays";
import { Skeleton } from "../../../components/ui/data";
import { Stack } from "../../../components/ui/layout";
import styles from "../../../components/story-reader.module.css";
export default function Loading() {
  const router = useRouter();
  return (
    <Dialog
      open
      title="Hämtar nyheten"
      variant="reader"
      className={styles.dialog}
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      <Stack gap={4} aria-busy="true">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </Stack>
    </Dialog>
  );
}
