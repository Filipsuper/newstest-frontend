import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nanexa · lokal lägesbild', robots: { index: false, follow: false } };

export default async function Page() {
  // No production override: real research snapshots remain outside the repo,
  // accessed only through this explicitly configured development route.
  if (process.env.NODE_ENV !== 'development' || !process.env.COMPANY_BRIEFING_SNAPSHOT) notFound();
  const [{ readFile }, { default: Preview }, { default: briefing }] = await Promise.all([
    import('node:fs/promises'), import('./BriefingPreview'), import('./nanexa-price.json'),
  ]);
  const snapshot = JSON.parse(await readFile(process.env.COMPANY_BRIEFING_SNAPSHOT, 'utf8'));
  if (snapshot.symbol !== briefing.symbol || snapshot.overview.status !== 200) notFound();
  const data = {
    ...snapshot.overview.body,
    // Local visual review only, no session/account/production access mutation.
    access: { plus: true },
    financials: snapshot.financials.body.data,
    reports: snapshot.reports.body.data.items,
    availability: { financials: 'available', reports: 'available', estimates: 'unavailable' },
  };
  return <Preview data={data} briefing={briefing} />;
}
