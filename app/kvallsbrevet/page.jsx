import LetterEditionPage from "../components/LetterEditionPage";
import { fetchEveningArticles } from "../utils/api";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Kvällsbrevet",
  description: "Nyheterna och aktiernas reaktioner efter börsens stängning.",
};

export default async function Page() {
  let articles;
  try {
    articles = await fetchEveningArticles();
  } catch {
    articles = null;
  }
  return (
    <LetterEditionPage
      articles={articles}
      evening
      unavailable={!Array.isArray(articles)}
    />
  );
}
