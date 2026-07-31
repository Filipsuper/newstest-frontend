import { fetchAllArticles } from "./utils/api";
import HomePage from "./components/HomePage";

export const dynamic = "force-dynamic";

export default async function Page() {
  let articles = null;
  try {
    articles = await fetchAllArticles();
  } catch (error) {
    articles = null;
  }

  return <HomePage articles={articles} />;
}
