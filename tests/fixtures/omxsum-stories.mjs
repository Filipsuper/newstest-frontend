// Fictional reviewed publications for local browser checks, not production seed.
const asOf = new Date(Date.now() - 3600000).toISOString();
const sourceTime = new Date(Date.now() - 86400000).toISOString();
const paragraph = (text, kind = 'fact') => ({ text, kind, sourceIds: ['doc-test'] });
const base = { schemaVersion: 1, status: 'published', revision: 1, symbol: 'NORD.TEST',
    companies: [{ symbol: 'NORD.TEST', name: 'Norden Industri', role: 'subject', reason: 'Fiktiv verifierad utgivare för testet' }],
    publishedAt: asOf, updatedAt: asOf, asOf, contentLabel: 'Fiktiv testdata · OMXsum',
    intro: paragraph('Fiktiv testdata. Omsättningen minskar samtidigt som EBITDA vänder till plus. Här jämförs siffrorna med samma rapports jämförelsetal.'),
    sections: [{ heading: 'Vad visar siffrorna?', paragraphs: [paragraph('Omsättningen förändrades −22,4 %. Beräkning: (23,63 / 30,45 − 1) × 100.', 'calculation')] },
        { heading: 'Beskedet i källan', paragraphs: [paragraph('Fiktivt källutdrag: nettoomsättning 23,63 MSEK (30,45 MSEK), EBITDA 1,11 MSEK (−0,07 MSEK).', 'source_excerpt')] }],
    metrics: [{ key: 'revenue', label: 'Nettoomsättning', display: '23,63 MSEK (30,45 MSEK)', value: 23630000, previousValue: 30450000, changePct: -22.4, currency: 'SEK', kind: 'reported', sourceIds: ['doc-test'] }],
    uncertainties: ['Aktuellt periodmatchat konsensus är inte verifierat.'],
    sources: [{ id: 'doc-test', kind: 'release', title: 'Fiktiv rapport från Norden Industri', url: 'https://example.com/fictional-report', publisher: 'Norden Industri', publishedAt: sourceTime, storyId: 'fixture-0' }],
    timeline: [{ at: sourceTime, title: 'Höjer prognosen efter stark orderingång', storyId: 'fixture-0', sourceIds: ['doc-test'] }],
};
export const omxsumStoryFixtures = [
    { ...base, id: 'omxs_' + '1'.repeat(24), format: 'report', headline: 'Norden Industri: positiv EBITDA trots lägre omsättning' },
    { ...base, id: 'omxs_' + '2'.repeat(24), format: 'deal', headline: 'Norden Industri: kontraktets storlek och villkor', intro: paragraph('Fiktiv testdata. Ett nytt kontrakt och bolagets storlek förklaras; kontraktsvärde är inte samma sak som intäkter.'),
        metrics: [{ key: 'orderValue', label: 'Kontraktsvärde', display: '20 MSEK', value: 20000000, currency: 'SEK', kind: 'reported', sourceIds: ['doc-test'] }] },
    { ...base, id: 'omxs_' + '3'.repeat(24), format: 'development', headline: 'Norden Industri: från avtal till leverans', intro: paragraph('Fiktiv testdata. Två uppdateringar samlade i en daterad tidslinje.'),
        sources: [...base.sources, { ...base.sources[0], id: 'doc-update', title: 'Fiktiv leveransuppdatering', url: 'https://example.com/fictional-delivery', publishedAt: asOf, storyId: 'fixture-5' }],
        timeline: [...base.timeline, { at: asOf, title: 'Utökar samarbetet inom industriell automation', storyId: 'fixture-5', sourceIds: ['doc-update'] }] },
];

// Explicit fictional v2 reader contract, not generated AI output or a real approval.
const metricKey = digit => 'm_' + digit.repeat(16);
const reportMetric = (digit, label, value, display, role) => ({ key: metricKey(digit), label, value, display,
    measure: 'report.ebit',
    unit: 'money', currency: 'SEK', role, kind: 'reported', sourceIds: ['doc-test'], conditions: [],
    period: role === 'reported_comparison' ? { state: 'source_comparison' } : { state: 'unverified' }, hiddenFromSummary: role === 'reported_comparison' });
const pastYear = new Date(asOf).getUTCFullYear() - 1;
const historyMetrics = [40, 65, 100].map((millions, index) => ({ key: metricKey(String(index + 5)), label: 'Årsomsättning',
    measure: 'revenue',
    value: millions * 1000000, display: `${millions} MSEK`, unit: 'money', currency: 'SEK', role: 'historical_reported',
    kind: 'reported', sourceIds: ['financial-test'], conditions: [], hiddenFromSummary: true,
    period: { end: `${pastYear - 2 + index}-12-31`, frequency: 'annual', basis: 'reported' } }));
export const omxsumV2Fixtures = [{ ...base, id: 'omxs_' + '4'.repeat(24), schemaVersion: 2, symbol: 'V2.TEST', format: 'report',
    companies: [{ ...base.companies[0], symbol: 'V2.TEST' }], contentLabel: 'Fiktiv v2-testartikel · inte AI-genererad',
    headline: 'Norden Industri tappar försäljning men förbättrar rörelseresultatet',
    intro: paragraph('Norden Industri redovisar lägre försäljning, samtidigt som förlusten på rörelsen krymper. Nettoomsättningen blev 23,63 MSEK, jämfört med 30,45 MSEK i rapportens jämförelsetal. Uppgifterna är fiktiva testdata.'),
    sections: [{ heading: null, paragraphs: [paragraph('EBIT förbättrades till −0,12 MSEK från −1,32 MSEK. Det innebär en mindre rörelseförlust, inte att bolaget har nått lönsamhet. Jämförelsen nedan bevarar de negativa resultaten.')] },
        { heading: 'Omsättningen i ett längre perspektiv', paragraphs: [{ ...paragraph('OMXsums fiktiva historik visar tre jämförbara helår. Dessa är bakgrund till rapporten och ska inte blandas med kvartalets omsättning.'), sourceIds: ['financial-test'] }] }],
    uncertainties: [], metrics: [reportMetric('1', 'EBIT · jämförelsetal', -1320000, '−1,32 MSEK', 'reported_comparison'),
        reportMetric('2', 'EBIT', -120000, '−0,12 MSEK', 'reported_current'), ...historyMetrics],
    charts: [{ id: 'chart_' + '1'.repeat(24), kind: 'bar', basis: 'report_comparison', title: 'Rörelseförlusten krymper',
        note: 'Samma mått och valuta. Rapportens jämförelsetal är inte tilldelat ett härlett kalenderår.', unit: 'money', currency: 'SEK',
        points: [{ label: 'Rapportens jämförelsetal', metricKey: metricKey('1') }, { label: 'Aktuell rapportperiod', metricKey: metricKey('2') }] },
        { id: 'chart_' + '2'.repeat(24), kind: 'line', basis: 'history', title: 'Årsomsättning över tid',
            note: 'Jämförbara rapporterade helår enligt OMXsums fiktiva testdata. Saknade år fylls inte med noll.', unit: 'money', currency: 'SEK',
            points: historyMetrics.map(metric => ({ label: metric.period.end, metricKey: metric.key })) }],
    sources: [...base.sources, { id: 'financial-test', kind: 'financial', title: 'Historiska rapportvärden enligt OMXsum', publisher: 'OMXsum', periodEnd: `${pastYear}-12-31` }],
}];
