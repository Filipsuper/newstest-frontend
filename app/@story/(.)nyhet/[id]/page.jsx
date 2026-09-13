import StoryDialog from "../../../components/StoryDialog";
import { loadStory, storyMetadata } from "../../../utils/storyServer";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }) {
  return storyMetadata((await params).id);
}
export default async function Page({ params }) {
  const { id } = await params;
  const result = await loadStory(id);
  if (!result.id) notFound();
  return <StoryDialog storyId={result.id} initialDetail={result.detail ?? null} />;
}
