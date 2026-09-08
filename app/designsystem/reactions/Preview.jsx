"use client";

import { useState } from "react";
import { Container, Heading, Stack, Text } from "../../components/ui/layout";
import { Label } from "../../components/ui/Label";
import { Dialog } from "../../components/ui/overlays";
import NewsFeedItem from "../../components/NewsFeedItem";
import StoryReaction from "../../components/StoryReaction";
import NewsSummary from "../../components/NewsSummary";
import { storyToItem } from "../../utils/storyToItem";
import { previewStories } from "./fixtures";
import styles from "../../components/story-reaction.module.css";
import readerStyles from "../../components/story-reader.module.css";

export default function Preview() {
  const [stories] = useState(previewStories);
  const [selected, setSelected] = useState(null);
  return (
    <Container reading className={styles.preview}>
      <Stack gap={3}>
        <Label>Fiktiv förhandsvisning · ingen livedata</Label>
        <Heading as="h1" size="page">Nyheter & kursreaktioner</Heading>
        <Text size="sm" tone="secondary">Reaction v2. Öppna en nyhet för senaste kursreaktion och handelsvolym. Exemplen är daterade 8 september 2026.</Text>
      </Stack>
      <Stack gap={3} className={styles.previewContent}>
        {stories.map(story => <NewsFeedItem key={story.id} item={storyToItem(story)} showSummary={false} showSymbol={false} onOpen={() => setSelected(story)} />)}
      </Stack>
      <Dialog variant="reader" className={readerStyles.dialog} open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}
        title="Fiktiv nyhet · lokal förhandsvisning" description="Denna förhandsvisning använder ingen verklig marknadsdata.">
        {selected && <Stack className={readerStyles.reader} gap={4}>
          <Heading size="section">{selected.headline}</Heading>
          <NewsSummary value={selected.aiSummary} reading />
          <StoryReaction key={selected.id} story={storyToItem(selected)} />
        </Stack>}
      </Dialog>
    </Container>
  );
}
