import ScreenerPage from "../../components/ScreenerPage";

export const metadata = {
    title: "Aktiescreener – hitta svenska börsbolag",
    description: "Upptäck svenska börsbolag med färdiga urval eller egna finansiella och tekniska filter.",
    alternates: { canonical: "/aktier/screener" },
};

export default function Page() {
    return <ScreenerPage />;
}
