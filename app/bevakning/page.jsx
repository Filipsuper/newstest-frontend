import WatchFeedPage from "../components/WatchFeedPage";

export const metadata = {
    title: "Bevakning",
    description: "Nyheter och marknadsreaktioner från bolagen och ämnena du följer.",
    robots: { index: false },
};

export default function Page() {
    return <WatchFeedPage />;
}
