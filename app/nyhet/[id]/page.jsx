import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { loadStory, storyMetadata } from "../../utils/storyServer";
import { normalizeStory, storyHref } from "../../utils/newsroom";
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
  if (result.detail) {
    const story = normalizeStory(result.detail.story ?? result.detail);
    const canonical = storyHref(result.id, story.title);
    if (canonical !== `/nyhet/${id}`) permanentRedirect(canonical);
  }
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
        key={result.id}
        storyId={result.id}
        initialDetail={result.detail ?? null}
      />
    </Container>
  );
}
