import React from 'react'
import ArticleComponent from "../components/ArticleComponent";
import { getArticle } from "../utils/api";
import { Link } from "react-router";
import { FaArrowLeft } from "react-icons/fa";

export const loader = async ({ params }) => {
    const { id } = params;
    const article = await getArticle(id);

    return article;
};

export function meta({ data: article }) {
    if (!article) {
        return [{ title: "Article not found" }];
    }
    return [
        { title: article.title },
        { name: "description", content: article.summar || "" },
        { property: "og:title", content: article.title },
        { property: "og:description", content: article.summary || article.description || "" },
        { property: "og:url", content: `https://omxsum.com/article/${article.id}` },
        { property: "og:type", content: "article" },
        // optionally, add og:image if you have one
    ];
}

export default function article({ params, loaderData }) {
    const article = loaderData;

    if (article.success === false) {
        return (
            <main>
                <h1>Article not found</h1>
            </main>
        )
    }


    return (
        <main>
            {/* <div className="p-2 px-8 w-full">
                <Link to="/" className="flex flex-row space-x-2 items-center"><FaArrowLeft /> <span>Back</span></Link>
            </div> */}
            <ArticleComponent article={article} />
        </main>
    )
}
