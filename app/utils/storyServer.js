import { cache } from "react";
import { fetchStory } from "./api";
import { normalizeStory, storyHref } from "./newsroom";
import { storyIdFromPath } from "./storyUrls";
import { CONTENT_OG_VERSION } from "./brand";

export const loadStory = cache(async (segment) => {
  const id = storyIdFromPath(segment);
  if (!id) return { notFound: true };
  try {
    return { id, detail: await fetchStory(id) };
  } catch (error) {
    return error.status === 404 ? { id, notFound: true } : { id, unavailable: true };
  }
});

export async function storyMetadata(id) {
  const result = await loadStory(id);
  if (!result.detail)
    return {
      title: result.notFound
        ? "Nyheten hittades inte"
        : "Nyheten är tillfälligt otillgänglig",
      robots: { index: !result.notFound, follow: true },
    };
  const story = normalizeStory(result.detail.story ?? result.detail);
  const description = (
    story.aiSummary?.text ||
    "Nyheten, källorna och aktiens utveckling kring publiceringen på OMXsum."
  ).slice(0, 240);
  const url = `https://omxsum.com${storyHref(result.id, story.title)}`;
  const image = {
    url: `https://omxsum.com${storyHref(result.id)}/opengraph-image?v=${CONTENT_OG_VERSION}`,
    width: 1200,
    height: 630,
    alt: story.title,
  };
  return {
    title: story.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: story.title,
      description,
      url,
      siteName: "OMXsum",
      locale: "sv_SE",
      type: "article",
      ...(Number.isFinite(story.ts)
        ? { publishedTime: new Date(story.ts).toISOString() }
        : {}),
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: story.title,
      description,
      images: [image.url],
    },
  };
}
