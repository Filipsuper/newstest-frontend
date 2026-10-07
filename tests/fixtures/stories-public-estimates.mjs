// Isolated, explicitly fictional public-reader integration fixture. Not a seed,
// a writer response, a provider attestation, or authorization to publish.
import { omxsumV2Fixtures } from './omxsum-stories.mjs';
import { storyEstimatesFixture } from '../../app/designsystem/stories/estimates/storyEstimatesFixture.js';
import { buildStoryEstimateContext, readerStoryEstimateContext } from '../../app/utils/storyEstimateContext.js';

export function publicEstimateArticleFixture(now = Date.now()) {
    const fixture = storyEstimatesFixture(now - 5000), stamp = new Date(now - 3000).toISOString();
    const article = { ...structuredClone(omxsumV2Fixtures[0]), ...fixture.article, status: 'published', publishedAt: stamp, updatedAt: stamp,
        headline: 'Fiktivt integrationstest: rapporterade värden och estimat', contentLabel: 'Fiktivt public-reader-test · inte AI-genererat eller publicerat',
        companies: [{ ...omxsumV2Fixtures[0].companies[0], symbol: fixture.article.symbol }], charts: [],
        metrics: fixture.article.metrics.map((metric, index) => ({ ...metric, label: ['Omsättning', 'EBIT', 'Vinst per aktie'][index],
            display: `${metric.value} ${metric.currency}`, hiddenFromSummary: false, conditions: [], sourceIds: ['financial-test'] })) };
    // Declared captured-origin branch for a synthetic contract test, never real
    // data attached to a real company/article or read from production Mongo.
    fixture.input.origin = 'recorded';
    article.estimateContext = readerStoryEstimateContext(buildStoryEstimateContext(article, fixture.input));
    return article;
}
