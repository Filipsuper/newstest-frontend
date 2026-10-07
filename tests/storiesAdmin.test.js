import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { omxsumV2Fixtures } from './fixtures/omxsum-stories.mjs';
import { StoriesAdminError, adminStoryBlockerLabel, checkedAdminDetail, checkedAdminList, checkedAdminSession, requestStoriesAdmin,
    sameStoryActionBinding, storiesAdminBaseUrl, storyActionBinding, storyActionBody } from '../app/utils/storiesAdmin.js';

const article = () => ({ ...structuredClone(omxsumV2Fixtures[0]), status: 'draft', publishedAt: null });
const digest = 'a'.repeat(64), ref = 'publication_' + 'b'.repeat(64), review = 'call_' + 'c'.repeat(32);
const manualRef = 'manual_publication_' + 'd'.repeat(64), sourceSetHash = 'e'.repeat(64);
const listRow = () => ({ id: article().id, revision: 1, contentHash: digest, headline: article().headline, symbol: article().symbol,
    status: 'draft', updatedAt: article().updatedAt, publicationRef: null });
const detailValue = () => ({ article: article(), revision: 1, contentHash: digest,
    sources: [{ id: 'doc-test', title: 'Originalrapport', publisher: 'Testbolaget', url: 'https://example.com/original', publishedAt: article().asOf,
        original: { title: 'Originalrapport', preamble: 'Rapportens ingress.', body: 'Rapportens fulltext.' } }],
    checks: [{ id: 'canonical_current', state: 'pass', reason: 'Aktuellt original kontrollerat.' }],
    publication: { ref: null, status: 'draft' }, approval: { reviewCallId: review }, actions: { canPublish: true, canWithdraw: false, blockers: [] } });
const response = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const historicalArticles = ['solidx', 'freemelt', 'soltech', 'cbrain'].map(name => JSON.parse(readFileSync(
    new URL(`../../../reports/omxsum-stories-recovered-20261006/${name}-historical-article.json`, import.meta.url), 'utf8')));
const historicalRow = (saved = historicalArticles[0]) => ({ id: saved.id, revision: saved.revision,
    contentHash: createHash('sha256').update(JSON.stringify(saved)).digest('hex'), headline: saved.headline, symbol: saved.symbol,
    status: 'historical', storageKind: 'historical_archive', updatedAt: saved.updatedAt, publicationRef: null, publicationRevision: null });
const historicalDetail = (saved = historicalArticles[0]) => ({ article: structuredClone(saved), revision: saved.revision,
    contentHash: historicalRow(saved).contentHash, storageKind: 'historical_archive', reviewCallId: null,
    archive: { publicationAllowed: false, serverPath: 'PRIVATE ARCHIVE PATH' },
    sources: saved.sources.map(source => ({ ...source, original: { title: '', preamble: '', body: '' }, fullTextAvailable: false })),
    checks: [{ id: 'historical_run_records_missing', state: 'block', reason: 'Fullständiga körningsunderlag saknas.' },
        { id: 'historical_review_missing', state: 'block', reason: 'Giltig sparad AI-granskning saknas.' }],
    publication: { ref: null, status: 'historical', revision: null },
    actions: { canPublish: false, canWithdraw: false, blockers: ['historical_run_records_missing'] } });
const manualDetail = (saved = historicalArticles[0]) => {
    const detail = historicalDetail(saved);
    detail.manualPublication = { mode: 'manual_editorial_beta', available: true, editorReviewRequired: true,
        sourceSetHash, sourceContext: 'current_editorial_review', privateKey: 'SECRET SIGNING KEY' };
    detail.sources = saved.sources.map(source => ({ ...source, original: { title: source.title, preamble: 'Aktuell ingress.', body: 'Aktuell originaltext för manuell granskning.' }, fullTextAvailable: true }));
    detail.checks.push(...['manual_archive_integrity', 'manual_source_binding', 'manual_financial_baseline'].map(id => ({ id, state: 'pass', reason: 'Aktuellt underlag kontrollerat.' })),
        { id: 'manual_editorial_review', state: 'hold', reason: 'Redaktören måste faktagranska och godkänna denna version.' });
    detail.actions = { canPublish: true, canWithdraw: false, blockers: [] };
    return detail;
};

test('private requests only use a same-origin configured API', () => {
    assert.equal(storiesAdminBaseUrl('/api', 'https://omxsum.com'), 'https://omxsum.com/api/admin/stories');
    assert.equal(storiesAdminBaseUrl('https://omxsum.com/api/', 'https://omxsum.com'), 'https://omxsum.com/api/admin/stories');
    for (const base of ['https://evil.test/api', '//evil.test/api', 'https://name:secret@omxsum.com/api', '/api?token=secret', 'javascript:alert(1)'])
        assert.throws(() => storiesAdminBaseUrl(base, 'https://omxsum.com'));
});

test('session projection drops server artifacts and requires explicit capability', () => {
    const input = { email: 'filipkarlberg1@gmail.com', csrfToken: 't'.repeat(64), capabilities: { operatorConfigured: false, signingKey: 'secret' }, prompt: 'secret' };
    assert.deepEqual(checkedAdminSession(input), { email: input.email, csrfToken: input.csrfToken, capabilities: { operatorConfigured: false } });
    assert.throws(() => checkedAdminSession({ ...input, capabilities: {} }), StoriesAdminError);
    assert.throws(() => checkedAdminSession({ ...input, csrfToken: '' }), StoriesAdminError);
    assert.throws(() => checkedAdminSession({ ...input, email: 'someone@example.com' }), error => error.status === 403);
    assert.equal(checkedAdminSession({ ...input, email: ' FilipKarlberg1@gmail.com ' }).email, input.email);
    assert.deepEqual(checkedAdminSession({ ...input, capabilities: { operatorConfigured: false, writesEnabled: true, manualPublicationEnabled: true } }).capabilities,
        { operatorConfigured: false, writesEnabled: true, manualPublicationEnabled: true });
    assert.throws(() => checkedAdminSession({ ...input, capabilities: { operatorConfigured: true, manualPublicationEnabled: 'true' } }), StoriesAdminError);
});

test('list is bounded, identity-specific and projects only UI fields', () => {
    const row = listRow();
    assert.deepEqual(checkedAdminList({ items: [{ ...row, prompt: 'secret' }], privateKey: 'secret' }), { items: [row], nextCursor: null });
    for (const value of [{ items: [row, row] }, { items: Array(101).fill(row) }, { items: [{ ...row, contentHash: 'bad' }] },
        { items: [{ ...row, status: 'toString' }] }, { items: [{ ...row, storageKind: { prompt: 'secret' } }] },
        { items: [row], nextCursor: '?url=evil' }]) assert.throws(() => checkedAdminList(value), StoriesAdminError);
});

test('four exact historical articles remain readable, chart-qualified and unpublishable', () => {
    const rows = historicalArticles.map(historicalRow);
    assert.equal(checkedAdminList({ items: rows }).items.length, 4);
    for (const saved of historicalArticles) {
        const checked = checkedAdminDetail(historicalDetail(saved), historicalRow(saved));
        assert.deepEqual(checked.article, saved);
        assert.equal(checked.storageKind, 'historical_archive');
        assert.deepEqual(checked.actions, { canPublish: false, canWithdraw: false, blockers: ['historical_run_records_missing'] });
        assert.equal(checked.sources.length, saved.sources.length);
        assert.equal(checked.sources.every(source => source.original === null), true);
        assert.equal(checked.reviewCallId, null);
        assert.doesNotMatch(JSON.stringify(checked), /PRIVATE ARCHIVE PATH/);
        const binding = storyActionBinding(checked);
        for (const action of ['publish', 'withdraw']) assert.throws(() => storyActionBody(action, binding,
            { confirmed: true, reasonCode: 'editorial_review' }), StoriesAdminError);
    }
});

test('historical list rows cannot forge publication, review or mutation capability', () => {
    for (const change of [{ status: 'published' }, { storageKind: 'v2_draft' }, { publicationRef: ref }, { publicationRevision: 1 },
        { canPublish: true }, { canWithdraw: true }, { actions: { canPublish: true, canWithdraw: false } },
        { publication: { ref } }, { reviewCallId: review }, { approval: { reviewCallId: review } }]) {
        assert.throws(() => checkedAdminList({ items: [{ ...historicalRow(), ...change }] }), StoriesAdminError);
    }
    assert.throws(() => checkedAdminList({ items: [{ ...listRow(), status: 'historical' }] }), StoriesAdminError);
});

test('historical detail rejects published states, fabricated runs, references and fulltext', () => {
    for (const mutate of [value => { value.actions.canPublish = true; }, value => { value.actions.canWithdraw = true; },
        value => { value.actions.blockers = []; }, value => { value.storageKind = 'v2_draft'; },
        value => { value.publication.ref = ref; }, value => { value.publication.status = 'published'; },
        value => { value.publication.revision = 1; }, value => { value.article.status = 'published'; value.article.publishedAt = value.article.asOf; },
        value => { value.status = 'published'; }, value => { value.reviewCallId = review; }, value => { value.approval = { reviewCallId: review }; },
        value => { value.archive.publicationAllowed = true; }, value => { value.checks[0].state = 'pass'; },
        value => { value.checks[1].state = 'pass'; }, value => { value.sources[0].original.body = 'Invented original'; },
        value => { value.sources[0].fullTextAvailable = true; }, value => { value.sources[0].id = 'forged-source'; },
        value => { value.sources[0].url = 'https://evil.example/forged-source'; }, value => { value.sources[0].publisher = 'Fabricated issuer'; }]) {
        const input = historicalDetail(); mutate(input);
        assert.throws(() => checkedAdminDetail(input, historicalRow()), StoriesAdminError);
    }
    assert.throws(() => checkedAdminDetail(historicalDetail(), { ...historicalRow(), storageKind: 'v2_draft' }), StoriesAdminError);
    const linksOnly = historicalDetail(); linksOnly.sources.forEach(source => { delete source.original; });
    assert.equal(checkedAdminDetail(linksOnly, historicalRow()).sources.every(source => source.original === null), true);
});

test('manual publication binds the immutable article and freshly reviewed source set without an AI reviewer', () => {
    const checked = checkedAdminDetail(manualDetail(), historicalRow());
    assert.equal(checked.reviewCallId, null);
    assert.equal(checked.manualPublication.sourceContext, 'current_editorial_review');
    assert.equal(checked.sources[0].original.body, 'Aktuell originaltext för manuell granskning.');
    assert.doesNotMatch(JSON.stringify(checked), /SECRET|SIGNING KEY|PRIVATE ARCHIVE PATH/);
    const binding = storyActionBinding(checked);
    assert.deepEqual(storyActionBody('publish', binding, { confirmed: true }), { revision: checked.revision,
        contentHash: checked.contentHash, expectedPublicationRef: null, confirmation: 'publish', reviewMode: 'manual_editorial_beta', sourceSetHash });
    assert.throws(() => storyActionBody('publish', binding), StoriesAdminError);
    assert.throws(() => storyActionBody('publish', { ...binding, reviewCallId: review }, { confirmed: true }), StoriesAdminError);
    assert.throws(() => storyActionBody('publish', { ...binding, sourceSetHash: null }, { confirmed: true }), StoriesAdminError);
    assert.equal(sameStoryActionBinding(binding, { ...checked, manualPublication: { ...checked.manualPublication, sourceSetHash: 'f'.repeat(64) } }), false);
});

test('manual archive capability rejects unconfigured mode, missing checks/hash, fabricated review and wrong source provenance', () => {
    for (const mutate of [value => { delete value.manualPublication; }, value => { value.manualPublication.available = false; },
        value => { value.manualPublication.mode = 'automatic'; }, value => { value.manualPublication.editorReviewRequired = false; },
        value => { value.manualPublication.sourceContext = 'old_writer_input'; }, value => { value.manualPublication.sourceSetHash = null; },
        value => { value.manualPublication.sourceSetHash = 'invalid'; }, value => { value.reviewCallId = review; },
        value => { value.sources[0].url = 'https://evil.example/'; }, value => { value.sources[0].original.body = 'x'.repeat(300001); },
        value => { value.sources = []; }, value => { value.sources[0].original.body = ''; },
        value => { value.actions.blockers = ['canonical_sources_changed']; }, value => { value.actions.canWithdraw = true; },
        value => { value.checks.find(row => row.id === 'manual_source_binding').state = 'hold'; },
        value => { value.checks.push({ id: 'manual_source_binding', state: 'block', reason: 'Konflikt.' }); },
        value => { value.checks = value.checks.filter(row => row.id !== 'manual_financial_baseline'); }]) {
        const input = manualDetail(); mutate(input);
        assert.throws(() => checkedAdminDetail(input, historicalRow()), StoriesAdminError);
    }
    const blocked = manualDetail(); blocked.manualPublication.sourceSetHash = null;
    blocked.actions = { canPublish: false, canWithdraw: false, blockers: ['canonical_sources_changed'] };
    blocked.checks.find(row => row.id === 'manual_source_binding').state = 'hold';
    assert.equal(checkedAdminDetail(blocked, historicalRow()).actions.canPublish, false);
});

test('manually published archive can be withdrawn using only its signed manual publication reference', () => {
    const publishedRow = { ...historicalRow(), status: 'published', publicationRef: manualRef, publicationRevision: 1 };
    assert.equal(checkedAdminList({ items: [publishedRow] }).items[0].publicationRef, manualRef);
    const input = manualDetail(); input.publication = { ref: manualRef, status: 'published', revision: 1 };
    input.actions = { canPublish: false, canWithdraw: true, blockers: ['already_published'] };
    const checked = checkedAdminDetail(input, publishedRow), binding = storyActionBinding(checked);
    assert.equal(checked.article.status, 'draft'); assert.equal(checked.article.publishedAt, null);
    assert.deepEqual(storyActionBody('withdraw', binding, { confirmed: true, reasonCode: 'factual_error' }),
        { publicationRef: manualRef, reasonCode: 'factual_error', confirmation: 'withdraw' });
    assert.throws(() => storyActionBody('publish', binding, { confirmed: true }), StoriesAdminError);
    assert.throws(() => storyActionBody('withdraw', { ...binding, expectedPublicationRef: ref }, { confirmed: true, reasonCode: 'factual_error' }), StoriesAdminError);
    const withdrawnRow = { ...publishedRow, status: 'withdrawn' }, withdrawn = { ...input,
        publication: { ref: manualRef, status: 'withdrawn', revision: 1 }, actions: { canPublish: false, canWithdraw: false, blockers: ['article_withdrawn'] } };
    assert.equal(checkedAdminDetail(withdrawn, withdrawnRow).actions.canPublish, false);
    assert.throws(() => checkedAdminDetail({ ...withdrawn, actions: { ...withdrawn.actions, canPublish: true } }, withdrawnRow), StoriesAdminError);
});

test('manual refs cannot cross into the normal v2 action path', () => {
    assert.throws(() => checkedAdminList({ items: [{ ...listRow(), status: 'published', publicationRef: manualRef, publicationRevision: 1 }] }), StoriesAdminError);
    const input = detailValue(); input.publication = { ref: manualRef, status: 'published', revision: 1 };
    assert.throws(() => checkedAdminDetail(input, listRow()), StoriesAdminError);
    const binding = storyActionBinding(checkedAdminDetail(detailValue(), listRow()));
    assert.throws(() => storyActionBody('withdraw', { ...binding, expectedPublicationRef: manualRef }, { confirmed: true, reasonCode: 'editorial_review' }), StoriesAdminError);
});

test('published revision remains separate from the newest draft revision', () => {
    const row = { ...listRow(), revision: 2, status: 'published', publicationRef: ref, publicationRevision: 1 };
    assert.equal(checkedAdminList({ items: [row] }).items[0].publicationRevision, 1);
    const input = detailValue(); input.publication = { status: 'published', ref, revision: 1 };
    assert.equal(checkedAdminDetail(input, listRow()).publication.revision, 1);
    input.publication.revision = 257;
    assert.throws(() => checkedAdminDetail(input, listRow()), StoriesAdminError);
});

test('checked preview preserves metric-bound charts and excludes private run/config fields', () => {
    const input = detailValue();
    input.request = { prompt: 'secret' }; input.article.prompt = 'secret'; input.article.metrics[0].providerRequest = 'secret';
    input.article.metrics[0].period.secret = 'secret'; input.sources[0].original.prompt = 'secret'; input.approval.signingKey = 'secret';
    const checked = checkedAdminDetail(input, listRow());
    assert.equal(checked.article.charts.length, 2);
    assert.equal(checked.sources[0].original.body, input.sources[0].original.body);
    assert.equal(checked.reviewCallId, review);
    assert.doesNotMatch(JSON.stringify(checked), /secret|prompt|signingKey|providerRequest/);
});

test('preview cannot quietly switch revision, article or content hash', () => {
    for (const mutate of [value => { value.revision = 2; }, value => { value.article.id = 'omxs_' + 'e'.repeat(24); },
        value => { value.contentHash = 'f'.repeat(64); }, value => { value.article.revision = 2; }]) {
        const input = detailValue(); mutate(input);
        assert.throws(() => checkedAdminDetail(input, listRow()), error => error.status === 409);
    }
});

test('malformed reader values, unsafe source links and oversized originals fail safely', () => {
    const unsafe = detailValue(); unsafe.sources[0].url = 'javascript:alert(1)';
    assert.equal(checkedAdminDetail(unsafe, listRow()).sources[0].url, null);
    const longOriginal = detailValue(); longOriginal.sources[0].original.body = 'a'.repeat(250000);
    assert.equal(checkedAdminDetail(longOriginal, listRow()).sources[0].original.body.length, 250000);
    for (const mutate of [value => { value.sources[0].original.body = 'a'.repeat(300001); },
        value => { value.article.contentLabel = {}; }, value => { value.article.uncertainties = [{}]; },
        value => { value.article.companies[0].name = {}; }, value => { value.article.metrics[0].display = {}; },
        value => { value.actions.blockers = [{}]; }]) {
        const input = detailValue(); mutate(input); assert.throws(() => checkedAdminDetail(input, listRow()), StoriesAdminError);
    }
});

test('confirmation binds the exact revision/hash, current publication and reviewer', () => {
    const checked = checkedAdminDetail(detailValue(), listRow()), binding = storyActionBinding(checked);
    assert.equal(sameStoryActionBinding(binding, checked), true);
    for (const change of [{ contentHash: 'd'.repeat(64) }, { revision: 2 }, { publication: { ref } }, { reviewCallId: null }])
        assert.equal(sameStoryActionBinding(binding, { ...checked, ...change }), false);
    assert.deepEqual(storyActionBody('publish', binding, { confirmed: true }), {
        revision: 1, contentHash: digest, reviewCallId: review, expectedPublicationRef: null, confirmation: 'publish' });
    assert.throws(() => storyActionBody('publish', binding), StoriesAdminError);
});

test('withdrawal needs the current immutable publication and an explicit supported reason', () => {
    const binding = storyActionBinding(checkedAdminDetail(detailValue(), listRow()));
    assert.throws(() => storyActionBody('withdraw', binding, { confirmed: true, reasonCode: 'factual_error' }), StoriesAdminError);
    binding.expectedPublicationRef = ref;
    assert.deepEqual(storyActionBody('withdraw', binding, { confirmed: true, reasonCode: 'factual_error' }),
        { publicationRef: ref, reasonCode: 'factual_error', confirmation: 'withdraw' });
    assert.throws(() => storyActionBody('withdraw', binding, { confirmed: true, reasonCode: 'free-text' }), StoriesAdminError);
});

test('reads include credentials, bypass caches and never follow login/third-party redirects', async () => {
    let request;
    await requestStoriesAdmin('/api/admin/stories', '/session', { fetchImpl: async (url, options) => { request = { url, options }; return response({}); } });
    assert.equal(request.url, '/api/admin/stories/session');
    assert.equal(request.options.credentials, 'include'); assert.equal(request.options.cache, 'no-store'); assert.equal(request.options.redirect, 'error');
    assert.equal(request.options.method, 'GET'); assert.equal(request.options.body, undefined); assert.equal(request.options.headers['x-stories-csrf'], undefined);
});

test('writes only happen on action endpoints with an explicit CSRF token and supplied body', async () => {
    let calls = 0, request;
    const fetchImpl = async (url, options) => { calls++; request = { url, options }; return response({ ok: true }); };
    const path = `/${article().id}/approve-publish`, body = storyActionBody('publish', storyActionBinding(checkedAdminDetail(detailValue(), listRow())), { confirmed: true });
    await assert.rejects(requestStoriesAdmin('/api/admin/stories', path, { method: 'POST', body, fetchImpl }), error => error.status === 403);
    await assert.rejects(requestStoriesAdmin('/api/admin/stories', '/session', { method: 'POST', csrfToken: 'token', body, fetchImpl }), StoriesAdminError);
    await assert.rejects(requestStoriesAdmin('/api/admin/stories', path, { fetchImpl }), StoriesAdminError);
    assert.equal(calls, 0);
    await requestStoriesAdmin('/api/admin/stories', path, { method: 'POST', csrfToken: 'token', body, fetchImpl });
    assert.equal(calls, 1); assert.equal(request.options.headers['x-stories-csrf'], 'token'); assert.deepEqual(JSON.parse(request.options.body), body);
});

for (const status of [401, 403, 404, 409, 429, 503]) test(`HTTP ${status} exposes a safe error, never original server traces`, async () => {
    await assert.rejects(requestStoriesAdmin('/api/admin/stories', '/session', { fetchImpl: async () => response({ code: 'safe_code', error: 'SECRET mongo credential stack' }, status) }),
        error => error instanceof StoriesAdminError && error.status === status && error.code === 'safe_code' && !error.message.includes('SECRET'));
});

test('non-JSON redirects/errors do not become raw DOM content', async () => {
    await assert.rejects(requestStoriesAdmin('/api/admin/stories', '/session', { fetchImpl: async () => new Response('<script>SECRET</script>', { status: 502 }) }),
        error => error instanceof StoriesAdminError && !error.message.includes('SECRET'));
});

test('unknown operation outcome demands reconciliation and blocker codes have readable Swedish labels', () => {
    const error = new StoriesAdminError(503, 'operation_outcome_unknown');
    assert.match(error.message, /kan ha hunnit genomföras/);
    assert.match(adminStoryBlockerLabel('saved_model_review_missing'), /sparad AI-granskning/);
    assert.doesNotMatch(adminStoryBlockerLabel('private_internal_unknown_code'), /private_internal_unknown_code/);
    assert.match(new StoriesAdminError(409, 'manual_sources_changed').message, /Originalkällorna har ändrats/);
});

test('selected article retains background and keyboard focus without an inset side border', () => {
    const css = readFileSync(new URL('../app/admin/stories/stories-admin.module.css', import.meta.url), 'utf8');
    const selected = css.match(/\.articleButton\[aria-pressed="true"\]\s*\{([^}]+)\}/)[1];
    assert.match(selected, /background:\s*var\(--ui-surface\)/);
    assert.doesNotMatch(selected, /border|box-shadow/);
    assert.match(css, /\.articleButton:focus-visible[^}]+outline:\s*2px solid var\(--ui-focus\)/);
});

test('SSR passes no private props; SPA boundary reloads before mounting the authenticated reader', () => {
    const page = readFileSync(new URL('../app/admin/stories/page.jsx', import.meta.url), 'utf8');
    const component = readFileSync(new URL('../app/admin/stories/StoriesAdmin.jsx', import.meta.url), 'utf8');
    assert.match(page, /robots: \{ index: false, follow: false/);
    assert.doesNotMatch(page, /readFile|fetch\(|snapshot=|article=/);
    assert.match(component, /window\.__OMXSUM_PRIVATE_DOCUMENT__ !== true/);
    assert.match(component, /window\.location\.replace\(window\.location\.href\)/);
    assert.match(component, /return privateDocument \? <AuthorizedStoriesAdmin/);
    assert.doesNotMatch(component, /dangerouslySetInnerHTML|localStorage|sessionStorage|console\.log/);
    assert.match(component, /rel="noopener noreferrer"/);
});
