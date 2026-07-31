import { notFound } from "next/navigation";
import ArticleComponent from "../../components/ArticleComponent";
import { getArticle } from "../../utils/api";
import { summaryExcerpt } from "../../utils/stripSummaryMarkup";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
    const { id } = await params;
    let article = null;
    try {
        article = await getArticle(id);
    } catch (error) {
        article = null;
    }

    if (!article || article.success === false) {
        return { title: "Artikeln hittades inte" };
    }

    const description = summaryExcerpt(article);

    return {
        title: article.title,
        description,
        alternates: { canonical: `/article/${id}` },
        openGraph: {
            title: article.title,
            description,
            url: `https://omxsum.com/article/${id}`,
            siteName: "Omxsum",
            type: "article",
            publishedTime: article.createdAt,
        },
        twitter: {
            card: "summary_large_image",
            title: article.title,
            description,
        },
    };
}

export default async function Page({ params }) {
    const { id } = await params;
    let article = null;
    try {
        article = await getArticle(id);
    } catch (error) {
        article = null;
    }

    if (!article || article.success === false) {
        notFound();
    }

    return (
        <main>
            <ArticleComponent article={article} />
        </main>
    );
}
