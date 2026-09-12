import { permanentRedirect } from "next/navigation";
import { canonicalWatchHref } from "../../utils/navigation";

export default async function Page({ searchParams }) {
    permanentRedirect(canonicalWatchHref(await searchParams, true));
}
