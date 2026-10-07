import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { omxsumV2Fixtures } from '../fixtures/omxsum-stories.mjs';

const email = 'filipkarlberg1@gmail.com', hash = 'a'.repeat(64), token = 'b'.repeat(64), ref = 'publication_' + 'c'.repeat(64), review = 'call_' + 'd'.repeat(32);
const draft = { ...structuredClone(omxsumV2Fixtures[0]), status: 'draft', publishedAt: null };
const historicalArticles = ['solidx', 'freemelt', 'soltech', 'cbrain'].map(name => JSON.parse(readFileSync(
    new URL(`../../../../reports/omxsum-stories-recovered-20261006/${name}-historical-article.json`, import.meta.url), 'utf8')));
const historicalHash = saved => createHash('sha256').update(JSON.stringify(saved)).digest('hex');
const manualRef = 'manual_publication_' + 'e'.repeat(64), sourceSetHash = 'f'.repeat(64);

async function mockAdmin(page, { denied = 0, configured = true, blocked = false, unknownOutcome = false, archives = false, forgedArchive = false,
    manual = false, manualSessionEnabled = true, manualWritesEnabled = true, sourcesChanged = false } = {}) {
    const observed = { reads: [], writes: [], external: [], errors: [], status: 'draft', publicationRef: null, archivePublications: {} };
    page.on('pageerror', error => observed.errors.push(error.message));
    await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
    await page.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (!['127.0.0.1', 'localhost'].includes(url.hostname)) { observed.external.push(url.href); return route.abort(); }
        if (!url.pathname.startsWith('/api/')) return route.continue();
        if (url.pathname === '/api/user') return route.fulfill({ json: { email: denied === 403 ? 'other@example.com' : email, verified: true, plan: 'free', watchlist: [] } });
        if (!url.pathname.startsWith('/api/admin/stories')) return route.fulfill({ json: { items: [], companies: [] } });
        if (request.method() === 'POST') {
            observed.writes.push({ path: url.pathname, body: request.postDataJSON(), csrf: request.headers()['x-stories-csrf'] });
            if (unknownOutcome) return route.fulfill({ status: 503, json: { code: 'operation_outcome_unknown' } });
            if (sourcesChanged) return route.fulfill({ status: 409, json: { code: 'manual_sources_changed' } });
            if (archives && manual) {
                const saved = historicalArticles.find(article => url.pathname.includes(`/${article.id}/`));
                observed.archivePublications[saved.id] = { ref: manualRef, status: url.pathname.endsWith('/withdraw') ? 'withdrawn' : 'published', revision: 1 };
                return route.fulfill({ json: { articleId: saved.id, revision: 1, publicationRef: manualRef, status: observed.archivePublications[saved.id].status } });
            }
            if (url.pathname.endsWith('/approve-publish')) { observed.status = 'published'; observed.publicationRef = ref; }
            if (url.pathname.endsWith('/withdraw')) observed.status = 'withdrawn';
            return route.fulfill({ json: { articleId: draft.id, revision: 1, publicationRef: ref, status: observed.status } });
        }
        observed.reads.push(url.pathname);
        if (url.pathname.endsWith('/session')) return route.fulfill({ status: denied || 200, json: denied ? { code: 'forbidden' }
            : { email, csrfToken: token, capabilities: { operatorConfigured: configured, writesEnabled: manual ? manualWritesEnabled : configured,
                ...(manual ? { manualPublicationEnabled: manualSessionEnabled } : {}) } } });
        if (archives) {
            if (url.pathname === '/api/admin/stories') return route.fulfill({ json: { items: historicalArticles.map(saved => ({
                id: saved.id, revision: saved.revision, contentHash: historicalHash(saved), headline: saved.headline, symbol: saved.symbol,
                status: observed.archivePublications[saved.id]?.status || 'historical', storageKind: 'historical_archive', updatedAt: saved.updatedAt,
                publicationRef: observed.archivePublications[saved.id]?.ref || null, publicationRevision: observed.archivePublications[saved.id]?.revision || null })), nextCursor: null } });
            const saved = historicalArticles.find(article => url.pathname.endsWith(`/${article.id}`));
            return route.fulfill({ json: { article: saved, revision: saved.revision, contentHash: historicalHash(saved), storageKind: 'historical_archive', reviewCallId: null,
                archive: { version: 'historical_archive_v1', importedAt: saved.updatedAt, publicationAllowed: false },
                ...(manual ? { manualPublication: { mode: 'manual_editorial_beta', available: true, editorReviewRequired: true,
                    sourceContext: 'current_editorial_review', sourceSetHash: blocked ? null : sourceSetHash } } : {}),
                publication: observed.archivePublications[saved.id] || { ref: null, status: 'historical', revision: null },
                sources: saved.sources.map(source => ({ ...source,
                    original: manual && source.kind === 'release' ? { title: source.title, preamble: 'Aktuell ingress.', body: 'CURRENT ORIGINAL TEXT FOR MANUAL FACTUAL REVIEW' }
                        : { title: '', preamble: '', body: '' }, fullTextAvailable: manual && source.kind === 'release' })),
                checks: [{ id: 'historical_run_records_missing', state: 'block', reason: 'Fullständiga körningsunderlag saknas.' },
                    { id: 'historical_review_missing', state: 'block', reason: 'Giltig sparad AI-granskning saknas.' },
                    ...(manual ? ['manual_archive_integrity', 'manual_source_binding', 'manual_financial_baseline'].map(id => ({ id,
                        state: blocked && id === 'manual_source_binding' ? 'hold' : 'pass', reason: 'Aktuell kontroll för manuell publicering.' })) : []),
                    ...(manual ? [{ id: 'manual_editorial_review', state: observed.archivePublications[saved.id] ? 'pass' : 'hold',
                        reason: observed.archivePublications[saved.id] ? 'Redaktörens manuella godkännande finns sparat.' : 'Redaktören måste själv faktagranska och godkänna.' }] : [])],
                actions: { canPublish: manual ? !blocked && !observed.archivePublications[saved.id] : forgedArchive,
                    canWithdraw: manual && observed.archivePublications[saved.id]?.status === 'published',
                    blockers: manual ? blocked ? ['canonical_sources_changed'] : observed.archivePublications[saved.id]
                        ? [observed.archivePublications[saved.id].status === 'published' ? 'already_published' : 'article_withdrawn'] : [] : ['historical_run_records_missing'] } } });
        }
        if (url.pathname === '/api/admin/stories') return route.fulfill({ json: { items: [{ id: draft.id, revision: 1, contentHash: hash,
            headline: draft.headline, symbol: draft.symbol, status: observed.status, updatedAt: draft.updatedAt, publicationRef: observed.publicationRef }], nextCursor: null } });
        return route.fulfill({ json: { article: draft, revision: 1, contentHash: hash, reviewCallId: review,
            publication: { ref: observed.publicationRef, status: observed.status, revision: observed.publicationRef ? 1 : null },
            sources: [{ id: 'doc-test', title: 'Originalrapport', publisher: 'Testbolaget', url: 'https://example.com/original', publishedAt: draft.asOf,
                original: { title: 'Originalrapport', preamble: 'Sparad ingress.', body: 'PRIVATE ORIGINAL TEXT ONLY FOR THE AUTHORIZED EDITOR' } }],
            checks: [{ id: 'canonical_current', state: blocked ? 'hold' : 'pass', reason: 'Originalkällans status är kontrollerad.' }],
            actions: { canPublish: configured && !blocked && observed.status === 'draft', canWithdraw: configured && observed.status === 'published',
                blockers: !configured ? ['operator_not_configured'] : blocked ? ['saved_model_review_missing'] : observed.status === 'published' ? ['already_published'] : [] } } });
    });
    return observed;
}

for (const denied of [401, 403]) test(`denied ${denied} never requests drafts or originals`, async ({ page }) => {
    const observed = await mockAdmin(page, { denied });
    await page.goto('/admin/stories');
    await expect(page.getByRole('heading', { level: 1, name: 'Stories-admin' })).toBeVisible();
    if (denied === 401) await expect(page.getByRole('button', { name: 'Skicka inloggningslänk' })).toBeVisible();
    else await expect(page.getByRole('main').getByRole('alert')).toContainText('inte åtkomst');
    expect(observed.reads.every(path => path.endsWith('/session'))).toBe(true);
    expect(observed.writes).toEqual([]); expect(observed.external).toEqual([]); expect(observed.errors).toEqual([]);
    await expect(page.getByText(draft.headline, { exact: true })).toHaveCount(0);
});

for (const width of [320, 1440]) test(`four recovered historical articles are selectable and read-only at ${width}px`, async ({ page }, testInfo) => {
    // Even an otherwise write-enabled session cannot act on an archived draft.
    const observed = await mockAdmin(page, { archives: true, configured: true });
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/admin/stories');
    const sidebar = page.getByRole('complementary', { name: 'Artiklar' });
    await expect(sidebar.getByText('Återfunnet utkast', { exact: true })).toHaveCount(4);
    for (const saved of historicalArticles) {
        await sidebar.getByRole('button').filter({ hasText: saved.headline }).click();
        await expect(page.getByRole('heading', { level: 1, name: saved.headline })).toBeVisible();
        await expect(page.getByText('Återfunnet utkast med den ursprungliga artikeltexten bevarad.', { exact: false })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Godkänn och publicera' })).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Dra tillbaka', exact: true })).toBeDisabled();
        await expect(page.getByRole('figure')).toHaveCount(saved.charts.length);
        await expect(page.getByRole('dialog')).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await sidebar.getByRole('button').filter({ hasText: historicalArticles[0].headline }).click();
    await expect(page.getByRole('heading', { level: 1, name: historicalArticles[0].headline })).toBeVisible();
    await page.locator('summary').filter({ hasText: 'Underlag & kontroller' }).click();
    const source = historicalArticles[0].sources[0];
    await page.locator('summary').filter({ hasText: source.title }).click();
    await expect(page.getByText('Originalets fulltext saknas i det återfunna artikelarkivet.', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Öppna originalkällan ↗' })).toHaveAttribute('href', source.url);
    expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
    expect(observed.writes).toEqual([]); expect(observed.external).toEqual([]); expect(observed.errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`stories-admin-historical-${width}.png`), fullPage: true });
});

test('forged historical mutation capability fails closed before preview or actions', async ({ page }) => {
    const observed = await mockAdmin(page, { archives: true, forgedArchive: true });
    await page.goto('/admin/stories');
    await expect(page.getByRole('region', { name: 'Artikelpreview' }).getByRole('alert')).toContainText('kunde inte slutföra');
    await expect(page.getByRole('button', { name: 'Godkänn och publicera' })).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(observed.writes).toEqual([]); expect(observed.errors).toEqual([]);
});

test('manual archive publishing shows current sources, requires factual approval and supports withdrawal', async ({ page }) => {
    const observed = await mockAdmin(page, { archives: true, manual: true, configured: false });
    const saved = historicalArticles[0];
    await page.goto('/admin/stories');
    await expect(page.getByRole('button', { name: 'Godkänn och publicera' })).toBeEnabled();
    await page.locator('summary').filter({ hasText: 'Underlag & kontroller' }).click();
    await expect(page.getByRole('heading', { name: 'Aktuella originalkällor för manuell granskning' })).toBeVisible();
    await expect(page.getByText('Detta är inte det förlorade underlaget från den tidigare AI-körningen.', { exact: false })).toBeVisible();
    await page.locator('summary').filter({ hasText: saved.sources[0].title }).click();
    await expect(page.getByText('CURRENT ORIGINAL TEXT FOR MANUAL FACTUAL REVIEW')).toBeVisible();
    await page.getByRole('button', { name: 'Godkänn och publicera' }).click();
    await expect(page.getByRole('dialog')).toContainText('saknar fullständiga äldre körningsunderlag och giltig sparad AI-granskning');
    await expect(page.getByRole('button', { name: 'Publicera denna version' })).toBeDisabled();
    expect(observed.writes).toEqual([]);
    await page.getByRole('checkbox', { name: 'Jag har manuellt faktagranskat denna version mot de aktuella originalkällorna och godkänner publicering på OMXsum.' }).check();
    await page.getByRole('button', { name: 'Publicera denna version' }).click();
    await expect(page.getByRole('button', { name: 'Dra tillbaka', exact: true })).toBeEnabled();
    expect(observed.writes[0]).toEqual({ path: `/api/admin/stories/${saved.id}/approve-publish`, csrf: token,
        body: { revision: 1, contentHash: historicalHash(saved), expectedPublicationRef: null, confirmation: 'publish', reviewMode: 'manual_editorial_beta', sourceSetHash } });
    expect(observed.writes[0].body.reviewCallId).toBeUndefined();
    await page.getByRole('button', { name: 'Dra tillbaka', exact: true }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Bekräfta indragning' }).click();
    await expect(page.getByRole('button', { name: 'Dra tillbaka', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Godkänn och publicera' })).toBeDisabled();
    expect(observed.writes[1]).toEqual({ path: `/api/admin/stories/${saved.id}/withdraw`, csrf: token,
        body: { publicationRef: manualRef, reasonCode: 'editorial_review', confirmation: 'withdraw' } });
    expect(observed.errors).toEqual([]); expect(observed.external).toEqual([]);
});

for (const disabled of ['manualSessionEnabled', 'manualWritesEnabled']) test(`manual archive actions need explicit session capability ${disabled}`, async ({ page }) => {
    const observed = await mockAdmin(page, { archives: true, manual: true, configured: false, [disabled]: false });
    await page.goto('/admin/stories');
    await expect(page.getByRole('heading', { level: 1, name: historicalArticles[0].headline })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Godkänn och publicera' })).toBeDisabled();
    expect(observed.writes).toEqual([]); expect(observed.errors).toEqual([]);
});

for (const outcome of ['unknownOutcome', 'sourcesChanged']) test(`manual ${outcome} requires a fresh preview and never retries automatically`, async ({ page }) => {
    const observed = await mockAdmin(page, { archives: true, manual: true, configured: false, [outcome]: true });
    await page.goto('/admin/stories');
    await page.getByRole('button', { name: 'Godkänn och publicera' }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Publicera denna version' }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText(outcome === 'sourcesChanged' ? 'Originalkällorna har ändrats' : 'kan ha hunnit genomföras');
    await page.getByRole('checkbox').check();
    await expect(page.getByRole('button', { name: 'Publicera denna version' })).toBeDisabled();
    expect(observed.writes).toHaveLength(1);
    await page.getByRole('dialog').getByRole('button', { name: 'Läs om status' }).click();
    await expect(page.getByRole('button', { name: 'Godkänn och publicera' })).toBeEnabled();
    expect(observed.writes).toHaveLength(1); expect(observed.errors).toEqual([]);
});

for (const theme of ['light', 'dark']) test(`selected article has no side border or inset shadow and retains keyboard focus in ${theme}`, async ({ page }, testInfo) => {
    const observed = await mockAdmin(page, { archives: true });
    await page.goto('/admin/stories');
    await expect(page.getByRole('heading', { level: 1, name: historicalArticles[0].headline })).toBeVisible();
    await page.evaluate(value => { document.documentElement.dataset.theme = value; document.documentElement.classList.toggle('dark', value === 'dark'); }, theme);
    const selected = page.getByRole('complementary', { name: 'Artiklar' }).locator('button[aria-pressed="true"]');
    const state = await selected.evaluate(element => {
        const style = getComputedStyle(element);
        return { shadow: style.boxShadow, borders: ['Top', 'Right', 'Bottom', 'Left'].map(side => style[`border${side}Width`]),
            selectedBackground: style.backgroundColor, unselectedBackground: getComputedStyle(element.parentElement.querySelector('button[aria-pressed="false"]')).backgroundColor };
    });
    expect(state.shadow).toBe('none'); expect(state.borders).toEqual(['0px', '0px', '0px', '0px']);
    expect(state.selectedBackground).not.toBe(state.unselectedBackground);
    await page.keyboard.press('Tab');
    await selected.focus();
    expect(await selected.evaluate(element => element.matches(':focus-visible'))).toBe(true);
    expect(await selected.evaluate(element => getComputedStyle(element).outlineWidth)).toBe('2px');
    await page.screenshot({ path: testInfo.outputPath(`stories-admin-selected-${theme}.png`), fullPage: true });
    expect(observed.writes).toEqual([]); expect(observed.errors).toEqual([]);
});

for (const width of [320, 1440]) test(`read-only compact preview and original text at ${width}px`, async ({ page }, testInfo) => {
    const observed = await mockAdmin(page, { configured: false });
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/admin/stories');
    await expect(page.getByRole('heading', { level: 1, name: draft.headline })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Godkänn och publicera' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Dra tillbaka', exact: true })).toBeDisabled();
    await expect(page.getByRole('figure')).toHaveCount(2);
    await page.locator('summary').filter({ hasText: 'Underlag & kontroller' }).click();
    await page.locator('summary').filter({ hasText: 'Originalrapport' }).click();
    await expect(page.getByText('PRIVATE ORIGINAL TEXT ONLY FOR THE AUTHORIZED EDITOR')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
    expect(observed.writes).toEqual([]); expect(observed.external).toEqual([]); expect(observed.errors).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`stories-admin-${width}.png`), fullPage: true });
});

test('explicit confirmation publishes exact revision and supports confirmed withdrawal', async ({ page }) => {
    const observed = await mockAdmin(page);
    await page.goto('/admin/stories');
    await page.getByRole('button', { name: 'Godkänn och publicera' }).click();
    await expect(page.getByRole('button', { name: 'Publicera denna version' })).toBeDisabled();
    expect(observed.writes).toEqual([]);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Publicera denna version' }).click();
    await expect(page.getByRole('button', { name: 'Dra tillbaka', exact: true })).toBeEnabled();
    expect(observed.writes[0]).toEqual({ path: `/api/admin/stories/${draft.id}/approve-publish`,
        body: { revision: 1, contentHash: hash, reviewCallId: review, expectedPublicationRef: null, confirmation: 'publish' }, csrf: token });
    await page.getByRole('button', { name: 'Dra tillbaka', exact: true }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Bekräfta indragning' }).click();
    await expect(page.getByRole('button', { name: 'Dra tillbaka', exact: true })).toBeDisabled();
    expect(observed.writes[1]).toEqual({ path: `/api/admin/stories/${draft.id}/withdraw`,
        body: { publicationRef: ref, reasonCode: 'editorial_review', confirmation: 'withdraw' }, csrf: token });
    expect(observed.errors).toEqual([]);
});

test('unknown write result prevents retries until fresh status is read', async ({ page }) => {
    const observed = await mockAdmin(page, { unknownOutcome: true });
    await page.goto('/admin/stories');
    await page.getByRole('button', { name: 'Godkänn och publicera' }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Publicera denna version' }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('kan ha hunnit genomföras');
    await page.getByRole('checkbox').check();
    await expect(page.getByRole('button', { name: 'Publicera denna version' })).toBeDisabled();
    expect(observed.writes).toHaveLength(1);
    await page.getByRole('dialog').getByRole('button', { name: 'Läs om status' }).click();
    await expect(page.getByRole('button', { name: 'Godkänn och publicera' })).toBeEnabled();
    expect(observed.writes).toHaveLength(1);
});
