import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Bolagets handelsdag · lokal förhandsvisning",
  robots: { index: false, follow: false },
};

export default async function Page() {
  if (process.env.NODE_ENV !== "development" && process.env.REACTION_V2_PREVIEW !== "1") notFound();
  const [{ default: Preview }, { sessionPreviewStories }] = await Promise.all([
    import("../reactions/Preview"), import("./fixtures"),
  ]);
  return <Preview initialStories={sessionPreviewStories()} title="Nyheter & bolagets handelsdag"
    description="Fiktiva stängningsbilder från 9 september 2026. Öppna en nyhet för att jämföra bolagets handelsdag med den separat uppmätta nyhetsreaktionen. Dagsuppgifterna gäller fram till nästa börsöppning." />;
}
