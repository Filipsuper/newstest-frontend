import StoryDialog from "../../../components/StoryDialog";
import { loadStory, storyMetadata } from "../../../utils/storyServer";

export async function generateMetadata({ params }) {
  return storyMetadata((await params).id);
}
export default async function Page({ params }) {
  const { id } = await params;
  const result = await loadStory(id);
  return <StoryDialog storyId={id} initialDetail={result.detail ?? null} />;
}
