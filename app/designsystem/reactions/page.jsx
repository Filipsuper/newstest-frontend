import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reaction v2 · lokal förhandsvisning", robots: { index: false, follow: false } };

export default async function Page() {
  if (process.env.NODE_ENV !== "development" && process.env.REACTION_V2_PREVIEW !== "1") notFound();
  const { default: Preview } = await import("./Preview");
  return <Preview />;
}
