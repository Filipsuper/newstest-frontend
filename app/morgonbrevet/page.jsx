import LetterEditionPage from "../components/LetterEditionPage";
import { fetchArticle } from "../utils/api";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Morgonbrevet",
  description:
    "Morgonens viktigaste marknadshändelser, sammanfattade varje vardag.",
};

export default async function Page() {
  let articles;
  try {
    articles = await fetchArticle();
  } catch {
    articles = null;
  }
  return (
    <LetterEditionPage
      articles={articles}
      unavailable={!Array.isArray(articles)}
    />
  );
}
