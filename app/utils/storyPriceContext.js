// Optional current market context. Never merge these observations into saved
// article claims, sources, publication dates or financial comparisons.
import { storyDateDisplay, storyPeriodDisplay } from './storyDateDisplay.js';

const DAY = 86_400_000;
const ARTICLE = /^omxs_[a-f0-9]{24}$/;
const REASONS = new Set(['unsupported_market', 'instrument_unavailable', 'missing_currency',
    'ambiguous_currency', 'missing_history', 'invalid_history', 'incomplete_history', 'history_unavailable']);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const dayTime = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T12:00:00Z`))
    && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
    ? Date.parse(`${value}T12:00:00Z`) : null;
const currentDay = time => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(time);

function windowStart(end) {
    const [year, month, day] = end.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 4, 1));
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
    return date.toISOString().slice(0, 10);
}

/** Pick only the public price contract and bind it to this exact reader version. */
export function checkedStoryPriceContext(value, article, { now = Date.now() } = {}) {
    if (!value || !ARTICLE.test(article?.id ?? '') || !Number.isInteger(article?.revision)
        || article.revision < 1 || article.revision > 256 || typeof article.symbol !== 'string'
        || value.schemaVersion !== 1 || value.articleId !== article.id || value.articleRevision !== article.revision
        || value.symbol !== article.symbol || value.scope !== 'omxsum_story_price_context'
        || value.contextMode !== 'current' || value.range !== '3m' || value.priceBasis !== 'close'
        || !['available', 'unavailable'].includes(value.status)
        || typeof value.asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value.asOf)
        || !finite(Date.parse(value.asOf)) || !finite(now) || Date.parse(value.asOf) > now + 60_000
        || !Array.isArray(value.points) || value.points.length > 100) return null;
    const base = { schemaVersion: 1, articleId: value.articleId, articleRevision: value.articleRevision,
        symbol: value.symbol, scope: value.scope, contextMode: value.contextMode, range: value.range,
        priceBasis: value.priceBasis, status: value.status, asOf: value.asOf };
    if (value.status === 'unavailable') {
        if (!REASONS.has(value.reason) || value.points.length
            || ['currency', 'window', 'firstClose', 'lastClose', 'changePct', 'lastStored', 'stale', 'ageDays'].some(key => value[key] !== null)) return null;
        return { ...base, reason: value.reason, currency: null, window: null, firstClose: null,
            lastClose: null, changePct: null, lastStored: null, stale: null, ageDays: null, points: [] };
    }
    if (typeof value.currency !== 'string' || !/^[A-Z]{3}$/.test(value.currency)
        || !value.window || dayTime(value.window.from) === null || dayTime(value.window.to) === null
        || value.window.from !== windowStart(value.window.to) || value.points.length < 2
        || !finite(value.firstClose) || !finite(value.lastClose) || !finite(value.changePct)
        || !Number.isInteger(value.ageDays) || value.ageDays < 1 || value.ageDays > 366
        || typeof value.stale !== 'boolean' || value.stale !== (value.ageDays > 5)) return null;
    const today = currentDay(Date.parse(value.asOf));
    const points = [];
    for (const point of value.points) {
        if (dayTime(point?.date) === null || !finite(point.close) || point.close <= 0
            || point.date < value.window.from || point.date > value.window.to || point.date >= today
            || points.length && point.date <= points.at(-1).date) return null;
        points.push({ date: point.date, close: point.close });
    }
    if (points.at(-1).date !== value.window.to || value.lastStored !== value.window.to
        || points[0].close !== value.firstClose || points.at(-1).close !== value.lastClose
        || dayTime(points[0].date) - dayTime(value.window.from) > 7 * DAY
        || value.ageDays !== Math.round((dayTime(today) - dayTime(value.lastStored)) / DAY)
        || Math.abs(value.changePct - (value.lastClose / value.firstClose - 1) * 100) > 1e-8) return null;
    return { ...base, currency: value.currency, window: { from: value.window.from, to: value.window.to },
        firstClose: value.firstClose, lastClose: value.lastClose, changePct: value.changePct,
        lastStored: value.lastStored, stale: value.stale, ageDays: value.ageDays, points };
}

export function storyPricePresentation(context) {
    if (context?.status !== 'available') return null;
    const shortDate = date => new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short',
        timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
    const number = value => value.toLocaleString('sv-SE', { maximumFractionDigits: 2 });
    const change = Math.abs(context.changePct) < 0.005 ? 0 : context.changePct;
    return {
        rows: context.points.map(point => ({ id: point.date, label: storyDateDisplay(point.date),
            axisLabel: shortDate(point.date), x: dayTime(point.date), values: { price: point.close } })),
        lastClose: `${number(context.lastClose)} ${context.currency}`,
        change: `${change > 0 ? '+' : change < 0 ? '−' : ''}${number(Math.abs(change))} %`,
        period: storyPeriodDisplay({ start: context.points[0].date, end: context.lastStored }),
        meta: `Aktuell kurskontext · senaste lagrade stängning ${storyDateDisplay(context.lastStored)}${context.stale ? ` · Äldre kursdata (${context.ageDays} dagar)` : ''}`,
        note: 'OMXsum · Kursförändring mellan grafens första och sista stängning, utan utdelningar. Separat från artikelns frysta underlag; visar inte nyhetens påverkan.',
    };
}

/** GET-only optional context. Admin is strictly same-origin and must only be
 * mounted by the already authenticated, private-document reader. */
export async function requestStoryPriceContext(article, { mode, base = '/api', origin,
    signal, fetchImpl = fetch, timeoutMs = 8000 } = {}) {
    if (!ARTICLE.test(article?.id ?? '') || !Number.isInteger(article.revision)
        || article.revision < 1 || article.revision > 256 || !['public', 'admin'].includes(mode)
        || mode === 'public' && article.status !== 'published') return null;
    let url;
    try { url = new URL(base, origin); } catch { return null; }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash
        || mode === 'admin' && (!origin || url.origin !== origin || !url.pathname.endsWith('/admin/stories'))) return null;
    url.pathname = `${url.pathname.replace(/\/$/, '')}${mode === 'admin' ? '' : '/feed/omxsum-stories'}/${article.id}/price-context`;
    if (mode === 'admin') url.searchParams.set('revision', String(article.revision));
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) return null;
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, timeoutMs);
    try {
        const response = await fetchImpl(url.href, { method: 'GET', credentials: mode === 'admin' ? 'include' : 'omit',
            cache: 'no-store', redirect: 'error', headers: { accept: 'application/json' }, signal: controller.signal });
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')
            || Number(response.headers.get('content-length')) > 96_000) return null;
        const body = await response.text();
        if (body.length > 96_000) return null;
        return checkedStoryPriceContext(JSON.parse(body)?.priceContext, article);
    } catch { return null; }
    finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
