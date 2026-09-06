"use client";
import { useRouter } from "next/navigation";
import { Dialog } from "./ui/overlays";
import StoryReader from "./StoryReader";
import styles from "./story-reader.module.css";

export default function StoryDialog({ storyId, initialDetail }) {
  const router = useRouter();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
      title="OMXsum · Nyheter"
      className={styles.dialog}
      variant="reader"
    >
      <StoryReader
        key={storyId}
        storyId={storyId}
        initialDetail={initialDetail}
      />
    </Dialog>
  );
}
