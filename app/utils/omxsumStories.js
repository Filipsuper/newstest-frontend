import { storySlug } from './storyUrls.js';
import { validStoryCharts } from './storiesCharts.js';
import { validStoryMetricValue } from './storyMetricValues.js';
import { validReaderStoryEstimateContext, readerStoryEstimateContext } from './storyEstimateContext.js';

export const OMXSUM_STORY_FORMATS = { report: 'Rapportförklaring', deal: 'Affären i sammanhang', development: 'Utvecklingen över tid' };
export const validOmxsumStoryFormat = value => typeof value === 'string' && Object.hasOwn(OMXSUM_STORY_FORMATS, value);
export const validOmxsumStoryId = id => typeof id === 'string' && /^omxs_[a-f0-9]{24}$/.test(id);
export function omxsumStoryId(segment) {
    if (typeof segment !== 'string') return null;
    const parts = segment.split('~');
    if (parts.length > 2 || (parts.length === 2 && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parts[0]))) return null;
    return validOmxsumStoryId(parts.at(-1)) ? parts.at(-1) : null;
}
export function omxsumStoryHref(article) {
    if (!validOmxsumStoryId(article?.id)) return null;
    const slug = storySlug(article.headline);
    return `/story/${slug ? `${slug}~` : ''}${article.id}`;
}
export function omxsumStoriesHref({ symbol, format, cursor } = {}) {
    const params = new URLSearchParams();
    if (typeof symbol === 'string' && /^[A-Z0-9.\-]{1,32}$/.test(symbol)) params.set('symbol', symbol);
    if (validOmxsumStoryFormat(format)) params.set('format', format);
    if (typeof cursor === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(cursor)) params.set('cursor', cursor);
    return `/marknaden/stories${params.size ? `?${params}` : ''}`;
}
export function qualifiedOmxsumStory(value) {
    const article = qualifyStory(value, false);
    if (!article) return null;
    if (article.estimateContext === undefined) return article;
    // Public callers never use the Studio's simulated or unredacted context.
    if (article.schemaVersion !== 2 || article.estimateContext?.origin !== 'recorded'
        || !validReaderStoryEstimateContext(article.estimateContext, article)
        || Date.parse(article.estimateContext.capturedAt) > Date.parse(article.publishedAt)) return null;
    const context = readerStoryEstimateContext(article.estimateContext);
    // Audit pointers have no purpose on the public reader.
    context.charts.forEach(chart => chart.rows.forEach(row => { delete row.evidenceId; }));
    return { ...article, estimateContext: context };
}
// Local Studio only. Public callers keep the published-only entry point.
export function qualifiedOmxsumStoryDraft(value) { return qualifyStory(value, true); }
function qualifyStory(value, draft) {
    const v2 = value?.schemaVersion === 2;
    if (!validOmxsumStoryId(value?.id) || ![1, 2].includes(value.schemaVersion) || value.status !== (draft ? 'draft' : 'published')
        || (draft && value.publishedAt !== null)
        || !validOmxsumStoryFormat(value.format) || typeof value.headline !== 'string' || !value.headline.trim() || value.headline.length > 200 || !value.intro?.text
        || typeof value.symbol !== 'string' || !/^[A-Z0-9.\-]{1,32}$/.test(value.symbol)
        || !Array.isArray(value.sources) || !value.sources.length || value.sources.length > (v2 ? 10 : 7)
        || !Array.isArray(value.sections) || !value.sections.length || value.sections.length > 8
        || !Array.isArray(value.metrics) || value.metrics.length > (v2 ? 30 : 10)
        || !Array.isArray(value.timeline) || !value.timeline.length || value.timeline.length > 6
        || !Array.isArray(value.companies) || value.companies.length !== 1
        || !value.companies[0]
        || value.companies[0].symbol !== value.symbol || value.companies[0].role !== 'subject'
        || !Array.isArray(value.uncertainties) || value.uncertainties.length > 8) return null;
    if (value.sources.some(source => !source || typeof source !== 'object')) return null;
    const ids = new Set(value.sources.map(source => source.id));
    if (ids.size !== value.sources.length || value.sources.some(source => {
        if (!/^[A-Za-z0-9_-]{1,80}$/.test(source.id) || typeof source.title !== 'string' || source.title.length > 600) return true;
        if (source.kind === 'financial') return !source.periodEnd;
        if (source.kind !== 'release') return true;
        try { const url = new URL(source.url); return url.protocol !== 'https:' || !!url.username || !!url.password; }
        catch { return true; }
    })) return null;
    const cited = item => typeof item?.text === 'string' && item.text.trim().length > 0 && item.text.length <= 1200
        && (v2 ? ['fact', 'calculation', 'limitation', 'attribution'] : ['fact', 'calculation', 'limitation', 'source_excerpt']).includes(item.kind)
        && Array.isArray(item.sourceIds) && item.sourceIds.length > 0 && item.sourceIds.every(id => ids.has(id));
    if (!cited(value.intro) || value.sections.some(section => !section || (v2 ? section.heading !== null && (typeof section.heading !== 'string' || !section.heading.trim() || section.heading.length > 120) : !section.heading) || !Array.isArray(section.paragraphs)
        || !section.paragraphs.length || section.paragraphs.length > 10 || section.paragraphs.some(item => !cited(item)))
        || value.metrics.some(metric => !metric || !metric.label || !metric.display || !Array.isArray(metric.sourceIds)
            || !metric.sourceIds.length || metric.sourceIds.some(id => !ids.has(id))
            || (v2 ? !validStoryMetricValue(metric) : ['value', 'previousValue', 'changePct'].some(key => metric[key] !== undefined && !Number.isFinite(metric[key]))))
        || value.timeline.some(item => !item || !/^[A-Za-z0-9_-]{1,80}$/.test(item.storyId) || !item.title || !Number.isFinite(Date.parse(item.at))
            || Date.parse(item.at) > Date.parse(value.asOf) || !Array.isArray(item.sourceIds) || !item.sourceIds.length
            || item.sourceIds.some(id => !value.sources.some(source => source.id === id && source.kind === 'release'
                && source.storyId === item.storyId && Date.parse(source.publishedAt) === Date.parse(item.at))))
        || (draft ? ['updatedAt', 'asOf'] : ['publishedAt', 'updatedAt', 'asOf']).some(key => !Number.isFinite(Date.parse(value[key])) || Date.parse(value[key]) > Date.now())) return null;
    if (v2 && (!validStoryCharts(value) || value.metrics.some(metric => typeof metric.hiddenFromSummary !== 'boolean'
        || !validStoryMetricValue(metric) || typeof metric.key !== 'string' || !/^m_[a-f0-9]{16}$/.test(metric.key)
        || !Array.isArray(metric.conditions) || metric.conditions.some(text => typeof text !== 'string' || text.length > 500))
        || value.sources.some(source => source.kind === 'financial' && source.publisher !== 'OMXsum'))) return null;
    return value;
}
