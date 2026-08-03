import StockPage from "../../components/StockPage";

export async function generateMetadata({ params }) {
    const { symbol } = await params;
    const decoded = decodeURIComponent(symbol);
    return {
        title: `${decoded.replace(".ST", "").replace("-", " ")} – Aktieöversikt`,
        description: `Kurs, graf och senaste nyheterna för ${decoded.replace(".ST", "").replace("-", " ")}.`,
        robots: { index: false },
    };
}

export default async function Page({ params }) {
    const { symbol } = await params;
    return <StockPage symbol={decodeURIComponent(symbol)} />;
}
