import StoriesAdmin from './StoriesAdmin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Stories-admin · OMXsum', robots: { index: false, follow: false, noarchive: true } };

// The document contains only a shell. Every private read is authenticated by
// the backend, after the client has verified this is a tracker-free document.
export default function Page() { return <StoriesAdmin />; }
