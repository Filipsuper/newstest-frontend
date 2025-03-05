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

export function meta() {
    return [
        { title: "OMXsum - Dagliga marknadssummeringar" },
        { name: "description", content: "Dagliga marknadssummeringar och viktiga pressmeddelanden från morgonens nyheter – genererade av AI varje dag kl. 08:00. Få en snabb överblick av den svenska börsen på OMXsum.com." },
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
            <div className="p-8 w-full">
                <Link to="/" className="flex flex-row space-x-2 items-center"><FaArrowLeft /> <span>Back</span></Link>
            </div>
            <ArticleComponent article={article} />
        </main>
    )
}
