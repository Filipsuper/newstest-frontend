import Link from "next/link";
import { notFound } from "next/navigation";
import { loadStory, storyMetadata } from "../../utils/storyServer";
import StoryReader from "../../components/StoryReader";
import { Container } from "../../components/ui/layout";
import { Button } from "../../components/ui/Button";
import styles from "../../components/story-reader.module.css";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }) {
  return storyMetadata((await params).id);
}
export default async function Page({ params }) {
  const { id } = await params;
  const result = await loadStory(id);
  if (result.notFound) notFound();
  return (
    <Container as="main" reading className={styles.page}>
      <Button
        variant="ghost"
        nativeButton={false}
        render={<Link href="/marknaden" />}
      >
        ← Marknaden
      </Button>
      <StoryReader
        key={id}
        storyId={id}
        initialDetail={result.detail ?? null}
      />
    </Container>
  );
}
