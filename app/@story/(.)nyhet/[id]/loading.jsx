"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StoryDialog from "../../../components/StoryDialog";
import { Dialog } from "../../../components/ui/overlays";
import { Skeleton } from "../../../components/ui/data";
import { Stack } from "../../../components/ui/layout";
import styles from "../../../components/story-reader.module.css";

export default function Loading() {
  const { id } = useParams();
  const router = useRouter();
  const [recoveryId, setRecoveryId] = useState(null);
  useEffect(() => {
    // Give the server reader time to arrive without mounting an interactive
    // client reader that a normal response would immediately replace.
    const timer = setTimeout(() => setRecoveryId(id), 3_000);
    return () => clearTimeout(timer);
  }, [id]);
  // History may restore this boundary after its original RSC request was
  // abandoned. The reader has its own bounded fetch and retry state.
  if (recoveryId === id) return <StoryDialog storyId={id} />;
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
