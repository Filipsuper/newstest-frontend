import { qualifiedOmxsumStory, qualifiedOmxsumStoryDraft, validOmxsumStoryId } from './omxsumStories.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max, empty = false) => typeof value === 'string' && (empty || value.trim().length > 0) && value.length <= max;
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const revision = value => Number.isInteger(value) && value >= 1 && value <= 256;
const v2PublicationRef = value => typeof value === 'string' && /^publication_[a-f0-9]{64}$/.test(value);
const manualPublicationRef = value => typeof value === 'string' && /^manual_publication_[a-f0-9]{64}$/.test(value);
const publicationRef = value => value === null || v2PublicationRef(value) || manualPublicationRef(value);
const pick = (value, fields) => Object.fromEntries(fields.filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]));
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const manualCheckIds = ['manual_archive_integrity', 'manual_source_binding', 'manual_financial_baseline'];
export const ADMIN_STORY_STATUSES = { draft: 'Utkast', historical: 'Återfunnet utkast', published: 'Publicerad', withdrawn: 'Indragen', retracted: 'Återkallad', blocked: 'Blockerad' };
export const adminStoryStatusLabel = item => item?.storageKind === 'manual_draft' ? 'Manuellt utkast' : ADMIN_STORY_STATUSES[item?.status];
export const MANUAL_EDITORIAL_REVIEW_MODE = 'manual_editorial_beta';
export const STORY_WITHDRAWAL_REASONS = [
    { value: 'factual_error', label: 'Faktafel' },
    { value: 'source_changed', label: 'Källan har ändrats' },
    { value: 'editorial_review', label: 'Ny redaktionell granskning' },
];
const blockerLabels = {
    operator_not_configured: 'Kopplingen till publiceringsverktyget saknas.',
    admin_writes_disabled: 'Publicering från redaktionsvyn är inte aktiverad.',
    public_reading_disabled: 'Den publika Stories-visningen är inte aktiverad.',
    publication_disabled: 'Publiceringsdriften är avstängd.',
    publication_key_missing: 'Publiceringsnyckeln saknas.',
    publication_key_mismatch: 'Serverns publiceringsnycklar behöver synkas.',
    canonical_sources_changed: 'Bolagskopplingen eller originalkällorna har ändrats sedan granskningen.',
    already_published: 'Den här artikelversionen är redan publicerad.',
    revision_already_published: 'Den här artikelversionen är redan publicerad.',
    article_withdrawn: 'Artikeln är indragen eller återkallad. Återpublicering hanteras separat.',
    saved_model_review_missing: 'En giltig sparad AI-granskning saknas för denna version.',
    publication_checks_not_passed: 'Alla obligatoriska publiceringskontroller är inte godkända.',
    current_checks_unavailable: 'Aktuella publiceringskontroller kunde inte verifieras.',
    frozen_research_verifier_missing: 'Artikelns sparade dataunderlag kunde inte kontrolleras.',
    frozen_research_invalid: 'Artikelns sparade dataunderlag är inte giltigt.',
    daily_limit_reached: 'Den dagliga publiceringsgränsen är nådd.',
    total_limit_reached: 'Betans totala publiceringsgräns är nådd.',
    publication_limit_reached: 'En av betans publiceringsgränser är nådd.',
    historical_run_records_missing: 'Utkastets fullständiga körningsunderlag saknas. Det kan läsas här, men inte publiceras.',
    saved_queue_missing: 'Den sparade utkastkön och kostnadshistoriken saknas. Publicering och indragning är blockerade.',
    manual_publication_disabled: 'Manuell publicering är inte aktiverad.',
    manual_publication_key_missing: 'Nyckeln för manuell publicering saknas.',
    manual_publication_not_configured: 'Den manuella publiceringskopplingen är inte konfigurerad.',
    manual_beta_disabled: 'Manuell betapublicering är avstängd.',
    manual_archive_not_allowed: 'Det här utkastet ingår inte i den godkända manuella betan.',
    manual_signing_unavailable: 'Nyckeln för manuell publicering kunde inte verifieras.',
    manual_source_binding_failed: 'Aktuella originalkällor, rättigheter eller bolagskopplingar kunde inte verifieras.',
    manual_financial_baseline_failed: 'Artikelns historiska rapportvärden kunde inte verifieras mot aktuellt underlag.',
    manual_receipt_invalid: 'Den sparade manuella publiceringsstatusen kunde inte verifieras.',
    manual_sources_changed: 'Originalkällorna har ändrats. Läs om status och granska de aktuella källorna igen.',
    manual_draft_publication_disabled: 'Det manuella utkastet är endast tillgängligt för granskning och kan inte publiceras här.',
    manual_draft_unreviewed: 'Texten saknar godkänd faktagranskning och redaktionellt godkännande.',
    canonical_issuer_binding_unverified: 'Bolagskopplingen behöver verifieras mot originalkällan.',
    source_full_text_missing: 'Originalets fulltext saknas. Endast sparad ingress finns för granskningen.',
    source_identity_alias_only: 'Källans bolagskoppling bygger på ett alias och behöver kontrolleras.',
    source_generic_fact_conflict: 'En generell uppgift i källan behöver stämmas av mot artikelns rapportvärden.',
};
export const adminStoryBlockerLabel = code => blockerLabels[code] || 'En obligatorisk publiceringskontroll är inte godkänd.';
const checkLabels = { pilot_scope: 'Betans urval', contracts: 'Datakontrakt', real_execution: 'Sparad generering', review_coverage: 'Granskningsomfattning',
    known_warnings: 'Kända varningar', central_facts: 'Centrala fakta', known_complexity: 'Villkor och komplexitet', canonical_current: 'Aktuella originalkällor', budget_ledger: 'Kostnadskontroll',
    historical_run_records: 'Sparade körningsunderlag', historical_model_review: 'Sparad AI-granskning',
    historical_run_records_missing: 'Sparade körningsunderlag', historical_review_missing: 'Sparad AI-granskning' };
Object.assign(checkLabels, { manual_archive_integrity: 'Bevarad artikelversion', manual_source_binding: 'Aktuella originalkällor',
    manual_financial_baseline: 'Finansiella jämförelsetal', manual_editorial_review: 'Manuell faktagranskning' });
Object.assign(checkLabels, { manual_draft_unreviewed: 'Faktagranskning och redaktionellt godkännande', canonical_issuer_binding_unverified: 'Bolagskoppling',
    source_full_text_missing: 'Originalets fulltext', source_identity_alias_only: 'Källans bolagsidentifiering', source_generic_fact_conflict: 'Källans rapportvärden' });
export const adminStoryCheckLabel = id => checkLabels[id] || 'Publiceringskontroll';

/** Private data never crosses to a configured third-party API origin. */
export function storiesAdminBaseUrl(apiBase = '/api', origin) {
    if (typeof apiBase !== 'string' || !origin) throw new Error('Adminanslutningen kunde inte verifieras.');
    const url = new URL(`${apiBase.replace(/\/$/, '')}/admin/stories`, origin);
    if (url.origin !== new URL(origin).origin || url.username || url.password || url.search || url.hash
        || !['http:', 'https:'].includes(url.protocol)) throw new Error('Adminanslutningen måste använda samma webbplats.');
    return url.href;
}

export class StoriesAdminError extends Error {
    constructor(status, code = '') {
        const messages = {
            401: 'Logga in igen för att öppna Stories-admin.',
            403: 'Det här kontot har inte åtkomst till Stories-admin.',
            404: 'Artikeln eller revisionen finns inte längre.',
            409: 'Artikelns status har ändrats. Läs om den och kontrollera den nya versionen.',
            429: 'För många försök. Vänta en stund och läs om status.',
            503: 'Publiceringsverktyget är inte tillgängligt. Ingen ny publicering kan göras här just nu.',
        };
        const outcome = code === 'operation_outcome_unknown'
            ? 'Resultatet är osäkert. Åtgärden kan ha hunnit genomföras. Läs om artikelstatus innan ett nytt försök.'
            : code === 'manual_sources_changed' ? blockerLabels.manual_sources_changed : null;
        super(outcome || messages[status] || 'Stories-admin kunde inte slutföra begäran. Försök läsa om status.');
        this.name = 'StoriesAdminError'; this.status = status;
        // Error codes, never server traces or arbitrary error text, are retained.
        this.code = typeof code === 'string' && /^[a-z0-9_-]{1,80}$/i.test(code) ? code : '';
    }
}

export async function requestStoriesAdmin(base, path = '', { signal, method = 'GET', csrfToken, body, fetchImpl = fetch } = {}) {
    if (!/^\/(?:session|omxs_[a-f0-9]{24}(?:\?revision=\d{1,3}|\/approve-publish|\/withdraw)?)?$/.test(path || '/') || !['GET', 'POST'].includes(method))
        throw new StoriesAdminError(400);
    if (method === 'POST' ? !/\/(approve-publish|withdraw)$/.test(path) : /\/(approve-publish|withdraw)$/.test(path)) throw new StoriesAdminError(400);
    if (method === 'POST' && !text(csrfToken, 512)) throw new StoriesAdminError(403);
    const response = await fetchImpl(`${base}${path}`, {
        method, credentials: 'include', cache: 'no-store', redirect: 'error',
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(method === 'POST' ? 35000 : 15000)]) : AbortSignal.timeout(method === 'POST' ? 35000 : 15000),
        headers: { Accept: 'application/json', ...(method === 'POST' ? { 'Content-Type': 'application/json', 'x-stories-csrf': csrfToken } : {}) },
        ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
    });
    if (Number(response.headers?.get('Content-Length')) > 4 * 1024 * 1024) throw new StoriesAdminError(502);
    let value;
    try {
        const raw = await response.text();
        if (raw.length > 4 * 1024 * 1024) throw new Error('Bounded response required');
        value = JSON.parse(raw);
    } catch { throw new StoriesAdminError(response.ok ? 502 : response.status); }
    if (!response.ok) throw new StoriesAdminError(response.status, value?.code);
    return value;
}

export function checkedAdminSession(value) {
    if (!object(value) || !text(value.email, 254) || !text(value.csrfToken, 512) || !object(value.capabilities)
        || typeof value.capabilities.operatorConfigured !== 'boolean') throw new StoriesAdminError(502);
    // Defense in depth only. The backend independently requires this exact
    // verified account; a client-side email can never grant access.
    const email = value.email.trim().toLowerCase();
    if (email !== 'filipkarlberg1@gmail.com') throw new StoriesAdminError(403);
    if (value.capabilities.writesEnabled !== undefined && typeof value.capabilities.writesEnabled !== 'boolean') throw new StoriesAdminError(502);
    if (value.capabilities.manualPublicationEnabled !== undefined && typeof value.capabilities.manualPublicationEnabled !== 'boolean') throw new StoriesAdminError(502);
    return { email, csrfToken: value.csrfToken, capabilities: { operatorConfigured: value.capabilities.operatorConfigured,
        ...(value.capabilities.writesEnabled !== undefined ? { writesEnabled: value.capabilities.writesEnabled } : {}),
        ...(value.capabilities.manualPublicationEnabled !== undefined ? { manualPublicationEnabled: value.capabilities.manualPublicationEnabled } : {}) } };
}

export function checkedAdminList(value) {
    if (!object(value) || !Array.isArray(value.items) || value.items.length > 100
        || (value.nextCursor != null && !/^[A-Za-z0-9_-]{1,200}$/.test(value.nextCursor))) throw new StoriesAdminError(502);
    const items = value.items.map(item => {
        if (!object(item) || !validOmxsumStoryId(item.id) || !revision(item.revision) || !hash(item.contentHash)
            || !text(item.headline, 200) || !/^[A-Z0-9.\-]{1,32}$/.test(item.symbol)
            || !Object.hasOwn(ADMIN_STORY_STATUSES, item.status) || !date(item.updatedAt)
            || item.storageKind !== undefined && !['v2_draft', 'historical_archive', 'manual_draft'].includes(item.storageKind)
            || !publicationRef(item.publicationRef) || item.publicationRevision != null && !revision(item.publicationRevision)) throw new StoriesAdminError(502);
        if (item.storageKind === 'historical_archive') {
            if (!['historical', 'published', 'withdrawn'].includes(item.status)
                || (item.status === 'historical' ? item.publicationRef !== null || item.publicationRevision != null
                    : !manualPublicationRef(item.publicationRef) || item.publicationRevision !== item.revision)
                || item.canPublish === true || item.canWithdraw === true || item.actions?.canPublish === true || item.actions?.canWithdraw === true
                || item.publication?.ref != null || item.reviewCallId != null || item.approval != null) throw new StoriesAdminError(502);
        } else if (item.storageKind === 'manual_draft') {
            if (item.status !== 'draft' || item.publicationRef !== null || item.publicationRevision != null
                || ['canPublish', 'canWithdraw', 'canApprove'].some(key => item[key] === true || item.actions?.[key] === true)
                || item.publication?.ref != null || item.reviewCallId != null || item.approval != null || item.manualPublication != null) throw new StoriesAdminError(502);
        } else if (item.status === 'historical' || manualPublicationRef(item.publicationRef)) throw new StoriesAdminError(502);
        return pick(item, ['id', 'revision', 'contentHash', 'headline', 'symbol', 'status', 'updatedAt', 'publicationRef', 'publicationRevision', 'storageKind']);
    });
    if (new Set(items.map(item => item.id)).size !== items.length) throw new StoriesAdminError(502);
    return { items, nextCursor: value.nextCursor ?? null };
}

function checkedReader(value) {
    if (!object(value)) return null;
    const article = pick(value, ['schemaVersion', 'id', 'revision', 'status', 'format', 'symbol', 'headline', 'publishedAt', 'updatedAt', 'asOf', 'contentLabel', 'uncertainties']);
    const rows = (input, fields) => Array.isArray(input) ? input.map(row => object(row) ? pick(row, fields) : row) : input;
    article.companies = rows(value.companies, ['symbol', 'name', 'role', 'reason']);
    article.sources = rows(value.sources, ['id', 'kind', 'title', 'url', 'publisher', 'publishedAt', 'periodEnd', 'storyId']);
    article.intro = object(value.intro) ? pick(value.intro, ['text', 'kind', 'sourceIds']) : value.intro;
    article.sections = Array.isArray(value.sections) ? value.sections.map(section => object(section)
        ? { heading: section.heading, paragraphs: rows(section.paragraphs, ['text', 'kind', 'sourceIds']) } : section) : value.sections;
    article.timeline = rows(value.timeline, ['at', 'title', 'storyId', 'sourceIds']);
    article.metrics = rows(value.metrics, ['key', 'label', 'display', 'value', 'previousValue', 'changePct', 'measure', 'unit', 'currency', 'role', 'kind', 'sourceIds', 'conditions', 'period', 'hiddenFromSummary']);
    if (Array.isArray(article.metrics)) article.metrics.forEach(metric => {
        if (object(metric) && object(metric.period)) metric.period = pick(metric.period, ['state', 'start', 'end', 'year', 'frequency', 'basis', 'label', 'lower', 'upper']);
    });
    article.charts = Array.isArray(value.charts) ? value.charts.map(chart => object(chart)
        ? { ...pick(chart, ['id', 'kind', 'basis', 'title', 'note', 'unit', 'currency']), points: rows(chart.points, ['label', 'metricKey']) } : chart) : value.charts;
    if (!text(article.contentLabel, 500) || !Array.isArray(article.companies) || article.companies.some(company => !object(company) || !text(company.name, 256))
        || !Array.isArray(article.sources) || article.sources.some(source => !object(source) || !text(source.publisher, 200))
        || !Array.isArray(article.metrics) || article.metrics.some(metric => !object(metric) || !text(metric.key, 80) || !text(metric.label, 200) || !text(metric.display, 300)
            || object(metric.period) && (metric.period.label !== undefined && !text(metric.period.label, 200)
                || ['lower', 'upper'].some(key => metric.period[key] !== undefined && !Number.isFinite(metric.period[key]))))
        || !Array.isArray(article.timeline) || article.timeline.some(item => !object(item) || !text(item.title, 600))
        || !Array.isArray(article.uncertainties) || article.uncertainties.some(item => !text(item, 1000))) return null;
    return article.status === 'draft' ? qualifiedOmxsumStoryDraft(article) : qualifiedOmxsumStory(article);
}

export function checkedAdminDetail(value, expected) {
    if (!object(value) || !revision(value.revision) || !hash(value.contentHash) || !object(value.actions)
        || value.storageKind !== undefined && !['v2_draft', 'historical_archive', 'manual_draft'].includes(value.storageKind)
        || typeof value.actions.canPublish !== 'boolean' || typeof value.actions.canWithdraw !== 'boolean'
        || !Array.isArray(value.actions.blockers) || value.actions.blockers.length > 30
        || value.actions.blockers.some(reason => !text(reason, 1000))
        || !object(value.publication) || !publicationRef(value.publication.ref)
        || !text(value.publication.status, 40) || value.publication.revision != null && !revision(value.publication.revision)
        || !Array.isArray(value.sources) || value.sources.length > 10
        || !Array.isArray(value.checks) || value.checks.length > 30) throw new StoriesAdminError(502);
    const historical = expected?.storageKind === 'historical_archive' || expected?.status === 'historical' || value.storageKind === 'historical_archive';
    const manualDraftBranch = expected?.storageKind === 'manual_draft' || value.storageKind === 'manual_draft';
    const manualDraft = value.manualDraft;
    if (manualDraftBranch && (expected?.storageKind !== 'manual_draft' || value.storageKind !== 'manual_draft' || expected.status !== 'draft'
        || expected.publicationRef !== null || expected.publicationRevision != null || value.article?.status !== 'draft' || value.article?.publishedAt !== null
        || value.status != null && value.status !== 'draft' || value.publication.status !== 'draft' || value.publication.ref !== null || value.publication.revision != null
        || value.reviewCallId != null || value.approval != null || value.archive != null || value.manualPublication != null
        || value.expectedPublicationRef != null || ['canPublish', 'canWithdraw', 'canApprove'].some(key => value[key] === true || value.actions[key] === true)
        || !object(manualDraft) || manualDraft.version !== 'stories-manual-draft-v1' || manualDraft.origin !== 'interactive_ai_assisted_manual_draft'
        || !date(manualDraft.createdAt) || !date(manualDraft.sourceCapturedAt) || manualDraft.sourceContext !== 'captured_original_snapshot'
        || !['original_body_available', 'preamble_only'].includes(manualDraft.sourceCompleteness) || manualDraft.publicationAllowed !== false
        || manualDraft.semanticReview !== null || manualDraft.editorialApproval !== null
        || ['manual_draft_publication_disabled', 'manual_draft_unreviewed', 'canonical_issuer_binding_unverified'].some(code => !value.actions.blockers.includes(code))
        || ['manual_draft_unreviewed', 'canonical_issuer_binding_unverified'].some(id => value.checks.filter(check => check?.id === id).length !== 1
            || !value.checks.some(check => check?.id === id && ['hold', 'block'].includes(check.state)))
        || manualDraft.sourceCompleteness === 'preamble_only' && (!value.actions.blockers.includes('source_full_text_missing')
            || value.checks.filter(check => check?.id === 'source_full_text_missing' && ['hold', 'block'].includes(check.state)).length !== 1))) throw new StoriesAdminError(502);
    if (!manualDraftBranch && manualDraft != null) throw new StoriesAdminError(502);
    const manual = value.manualPublication;
    if (manual != null && (!historical || !object(manual) || manual.mode !== MANUAL_EDITORIAL_REVIEW_MODE
        || typeof manual.available !== 'boolean' || manual.editorReviewRequired !== true
        || manual.sourceSetHash != null && !hash(manual.sourceSetHash)
        || manual.sourceContext !== undefined && manual.sourceContext !== 'current_editorial_review'
        || manual.available === true && manual.sourceContext !== 'current_editorial_review')) throw new StoriesAdminError(502);
    const manualAvailable = historical && manual?.available === true;
    if (historical && (expected?.storageKind !== 'historical_archive' || !['historical', 'published', 'withdrawn'].includes(expected?.status) || value.storageKind !== 'historical_archive'
        || !['historical', 'published', 'withdrawn'].includes(value.publication.status) || value.publication.status !== expected.status
        || (value.publication.status === 'historical' ? value.publication.ref !== null || value.publication.revision != null
            : !manualPublicationRef(value.publication.ref) || value.publication.revision !== value.revision)
        || value.publication.ref !== expected.publicationRef || (value.publication.revision ?? null) !== (expected.publicationRevision ?? null)
        || value.reviewCallId != null || value.approval != null
        || value.archive != null && (!object(value.archive) || value.archive.publicationAllowed !== false)
        || value.status != null && value.status !== value.publication.status
        || ['historical_run_records_missing', 'historical_review_missing'].some(id => value.checks.filter(check => check?.id === id).length !== 1
            || !value.checks.some(check => check?.id === id && check.state !== 'pass'))
        || value.article?.status !== 'draft' || value.article?.publishedAt !== null)) throw new StoriesAdminError(502);
    if (historical) {
        const requiredChecks = manualCheckIds.every(id => value.checks.filter(check => check?.id === id).length === 1);
        const passedChecks = manualCheckIds.every(id => value.checks.filter(check => check?.id === id && check.state === 'pass').length === 1);
        if (!manualAvailable && (value.actions.canPublish || value.actions.canWithdraw || !value.actions.blockers.includes('historical_run_records_missing'))
            || manualAvailable && !requiredChecks
            || value.actions.canPublish && (value.publication.status !== 'historical' || !passedChecks || value.actions.blockers.length || !hash(manual.sourceSetHash))
            || value.actions.canWithdraw && value.publication.status !== 'published') throw new StoriesAdminError(502);
    } else if (manualPublicationRef(value.publication.ref)) throw new StoriesAdminError(502);
    const article = checkedReader(value.article);
    if (!article || article.id !== expected.id || article.revision !== value.revision || value.revision !== expected.revision
        || value.contentHash !== expected.contentHash) throw new StoriesAdminError(409);
    const sources = value.sources.map(source => {
        const currentManualSource = manualAvailable && manual.sourceContext === 'current_editorial_review';
        if (!object(source) || !text(source.id, 80) || !text(source.title, 600) || !text(source.publisher, 200)
            || manualDraftBranch && typeof source.fullTextAvailable !== 'boolean'
            || (historical && !currentManualSource ? source.fullTextAvailable === true || source.original != null && (!object(source.original)
                || source.fullTextAvailable !== false || ['title', 'preamble', 'body'].some(field => source.original[field] !== ''))
                : !object(source.original) || ['title', 'preamble', 'body'].some(field => !text(source.original[field], 300000, true))
                || source.original.title.length + source.original.preamble.length + source.original.body.length > 300000)) throw new StoriesAdminError(502);
        let url = null;
        try { const parsed = new URL(source.url); if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) url = parsed.href; } catch {}
        if (historical || manualDraftBranch) {
            const savedSource = article.sources.find(row => row.id === source.id);
            let savedUrl = null;
            try { if (savedSource?.url) savedUrl = new URL(savedSource.url).href; } catch {}
            if (!savedSource || source.title !== savedSource.title || source.publisher !== savedSource.publisher || url !== savedUrl
                || (source.publishedAt ?? null) !== (savedSource.publishedAt ?? null)) throw new StoriesAdminError(502);
        }
        return { ...pick(source, ['id', 'title', 'publisher', 'publishedAt']), url,
            ...(manualDraftBranch ? { fullTextAvailable: source.fullTextAvailable } : {}),
            original: historical && !currentManualSource ? null : pick(source.original, ['title', 'preamble', 'body']) };
    });
    if (new Set(sources.map(source => source.id)).size !== sources.length) throw new StoriesAdminError(502);
    if ((historical || manualDraftBranch) && (sources.length !== article.sources.length
        || value.actions.canPublish && article.sources.some(source => source.kind === 'release'
            && !sources.find(row => row.id === source.id)?.original?.body.trim()))) throw new StoriesAdminError(502);
    if (manualDraftBranch && article.sources.some(source => source.kind === 'release'
        && (manualDraft.sourceCompleteness === 'original_body_available'
            ? !sources.find(row => row.id === source.id)?.fullTextAvailable || !sources.find(row => row.id === source.id)?.original.body.trim()
            : sources.find(row => row.id === source.id)?.fullTextAvailable))) throw new StoriesAdminError(502);
    const checks = value.checks.map(check => {
        if (!object(check) || !text(check.id, 80) || !text(check.state, 40) || !text(check.reason, 1000)) throw new StoriesAdminError(502);
        return pick(check, ['id', 'state', 'reason']);
    });
    const reviewCallId = value.reviewCallId ?? value.approval?.reviewCallId ?? null;
    if (reviewCallId !== null && !/^call_[a-f0-9]{32}$/.test(reviewCallId)) throw new StoriesAdminError(502);
    return { article, revision: value.revision, contentHash: value.contentHash, sources, checks, reviewCallId,
        ...(historical ? { storageKind: 'historical_archive' } : {}),
        ...(manualDraftBranch ? { storageKind: 'manual_draft', manualDraft: pick(manualDraft,
            ['version', 'origin', 'createdAt', 'sourceCapturedAt', 'sourceContext', 'sourceCompleteness', 'publicationAllowed', 'semanticReview', 'editorialApproval']) } : {}),
        ...(manual != null ? { manualPublication: pick(manual, ['mode', 'available', 'editorReviewRequired', 'sourceSetHash', 'sourceContext']) } : {}),
        publication: pick(value.publication, ['ref', 'status', 'revision']), actions: pick(value.actions, ['canPublish', 'canWithdraw', 'blockers']) };
}

export function storyActionBinding(detail) {
    return { id: detail.article.id, revision: detail.revision, contentHash: detail.contentHash,
        expectedPublicationRef: detail.publication.ref, reviewCallId: detail.reviewCallId,
        ...(detail.storageKind === 'manual_draft' ? { storageKind: 'manual_draft' } : {}),
        ...(detail.storageKind === 'historical_archive' ? { storageKind: 'historical_archive',
            ...(detail.manualPublication?.available === true ? { reviewMode: MANUAL_EDITORIAL_REVIEW_MODE,
                ...(detail.manualPublication.sourceSetHash ? { sourceSetHash: detail.manualPublication.sourceSetHash } : {}) } : {}) } : {}) };
}

export function sameStoryActionBinding(binding, detail) {
    return !!binding && !!detail && JSON.stringify(binding) === JSON.stringify(storyActionBinding(detail));
}

export function storyActionBody(action, binding, { confirmed = false, reasonCode } = {}) {
    if (binding?.storageKind === 'manual_draft') throw new StoriesAdminError(400);
    if (!confirmed || !validOmxsumStoryId(binding?.id) || !revision(binding.revision) || !hash(binding.contentHash)
        || !publicationRef(binding.expectedPublicationRef)) throw new StoriesAdminError(400);
    if (binding.storageKind === 'historical_archive') {
        if (binding.reviewMode !== MANUAL_EDITORIAL_REVIEW_MODE || binding.reviewCallId !== null
            || binding.expectedPublicationRef !== null && !manualPublicationRef(binding.expectedPublicationRef)) throw new StoriesAdminError(400);
        if (action === 'publish' && binding.expectedPublicationRef === null && hash(binding.sourceSetHash)) return { revision: binding.revision, contentHash: binding.contentHash,
            expectedPublicationRef: null, confirmation: 'publish', reviewMode: MANUAL_EDITORIAL_REVIEW_MODE,
            sourceSetHash: binding.sourceSetHash };
        if (action === 'withdraw' && manualPublicationRef(binding.expectedPublicationRef) && STORY_WITHDRAWAL_REASONS.some(row => row.value === reasonCode))
            return { publicationRef: binding.expectedPublicationRef, reasonCode, confirmation: 'withdraw' };
        throw new StoriesAdminError(400);
    }
    if (manualPublicationRef(binding.expectedPublicationRef) || binding.reviewMode !== undefined) throw new StoriesAdminError(400);
    if (action === 'publish') return { revision: binding.revision, contentHash: binding.contentHash,
        ...(binding.reviewCallId ? { reviewCallId: binding.reviewCallId } : {}), expectedPublicationRef: binding.expectedPublicationRef, confirmation: 'publish' };
    if (action === 'withdraw' && binding.expectedPublicationRef && STORY_WITHDRAWAL_REASONS.some(row => row.value === reasonCode))
        return { publicationRef: binding.expectedPublicationRef, reasonCode, confirmation: 'withdraw' };
    throw new StoriesAdminError(400);
}
