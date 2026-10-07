import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldLoadSiteScripts } from '../app/utils/siteScriptsPolicy.js';
import nextConfig from '../next.config.mjs';

for (const path of ['/admin', '/admin/', '/admin/stories', '/admin/stories/example', '/designsystem/stories', '/designsystem/stories/', '/designsystem/stories/runs', '/bekrafta', '/kom-igang', null, undefined, '', 'relative']) {
    test(`third-party scripts stay off for ${String(path)}`, () => assert.equal(shouldLoadSiteScripts(path), false));
}
for (const path of ['/', '/marknaden/stories', '/story/example', '/designsystem', '/designsystem/rss', '/designsystem/stories-example']) {
    test(`existing public script eligibility remains for ${path}`, () => assert.equal(shouldLoadSiteScripts(path), true));
}
test('SiteScripts consults the route policy before mounting any existing providers', () => {
    const component = readFileSync(new URL('../app/components/SiteScripts.jsx', import.meta.url), 'utf8');
    assert.match(component, /import \{ shouldLoadSiteScripts \} from/);
    assert.ok(component.indexOf('if (!shouldLoadSiteScripts(path)) return null;') < component.indexOf('<Script'));
    for (const provider of ['getmegadesk.com', 'pagead2.googlesyndication.com', 'simpleanalyticscdn.com', 'unhidden.so']) {
        assert.ok(component.includes(provider), 'Existing public providers remain configured');
    }
});
test('only a fresh admin document is eligible to load private data, and public scripts disqualify it', () => {
    const layout = readFileSync(new URL('../app/layout.jsx', import.meta.url), 'utf8');
    const body = layout.match(/const themeInitScript = `([\s\S]*?)`;/)?.[1];
    assert.ok(body);
    const script = new Function(`return \`${body}\`;`)();
    for (const pathname of ['/admin', '/admin/stories', '/admin/stories/article', '/', '/admin-example', '/story/example']) {
        const window = { location: { pathname }, matchMedia: () => ({ matches: false }) };
        const document = { documentElement: { classList: { add() {}, remove() {} }, dataset: {} } };
        new Function('window', 'document', 'localStorage', script)(window, document, { getItem: () => null });
        assert.equal(window.__OMXSUM_PRIVATE_DOCUMENT__, /^\/admin(?:\/|$)/.test(pathname));
    }
    const component = readFileSync(new URL('../app/components/SiteScripts.jsx', import.meta.url), 'utf8');
    assert.ok(component.indexOf('window.__OMXSUM_PRIVATE_DOCUMENT__ = false') < component.indexOf('<Script'));
});
test('admin document blocks external fonts, trackers and framing while keeping production eval disabled', async () => {
    const entry = (await nextConfig.headers()).find(row => row.source === '/admin/:path*');
    const headers = Object.fromEntries(entry.headers.map(row => [row.key, row.value]));
    assert.match(headers['Cache-Control'], /private, no-store/);
    assert.match(headers['X-Robots-Tag'], /noindex/);
    assert.equal(headers['Referrer-Policy'], 'no-referrer');
    const policy = headers['Content-Security-Policy'];
    assert.match(policy, /style-src 'self' 'unsafe-inline'/);
    assert.match(policy, /font-src 'self' data:/);
    assert.match(policy, /connect-src 'self'/);
    assert.match(policy, /frame-ancestors 'none'/);
    if (process.env.NODE_ENV !== 'development') assert.doesNotMatch(policy, /unsafe-eval/);
    assert.doesNotMatch(policy, /https:|\*/);
});
