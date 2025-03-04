import React from 'react'
import ArticleComponent from "../components/ArticleComponent";
import { getArticle } from "../utils/api";
import { Link } from "react-router";
import { FaArrowLeft } from "react-icons/fa";

export const loader = async ({ params }) => {
    const { id } = params;
    const article = await getArticle(id);
    console.log("Loader", article);
    return article;
};

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
            <div className="p-8 w-full">
                <Link to="/" className="flex flex-row space-x-2 items-center"><FaArrowLeft /> <span>Back</span></Link>
            </div>
            <ArticleComponent article={article} />
        </main>
    )
}
