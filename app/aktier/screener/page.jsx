import ScreenerPage from "../../components/ScreenerPage";
import { BRAND_LABEL, SCREENER_OG_IMAGE } from '../../utils/brand';

const title = 'Aktiescreener – hitta svenska börsbolag';
const description = 'Upptäck svenska börsbolag med färdiga urval eller egna finansiella och tekniska filter.';

export const metadata = {
    title,
    description,
    alternates: { canonical: "/aktier/screener" },
    openGraph: {
        title,
        description,
        url: '/aktier/screener',
        siteName: BRAND_LABEL,
        locale: 'sv_SE',
        type: 'website',
        images: [SCREENER_OG_IMAGE],
    },
    twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [SCREENER_OG_IMAGE],
    },
};

export default function Page() {
    return <ScreenerPage />;
}
