import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Stories listing uses the shared compact workspace heading and existing subtitle', () => {
  const page = read('../app/marknaden/stories/page.jsx');
  assert.match(page, /<header className=\{workspace\.heading\}><Stack gap=\{2\}>/);
  assert.ok(page.includes('<Text size="sm" tone="secondary">Fördjupning om bolagen och händelserna på börsen.</Text>'));
});

test('Stories page aligns navigation without changing reader or card geometry', () => {
  const css = read('../app/components/omxsum-stories.module.css');
  const navigation = read('../app/components/workspace-nav.module.css');
  assert.match(css, /composes: page from "\.\/workspace-nav\.module\.css"/);
  assert.match(navigation, /\.page\s*\{[^}]*padding-top: var\(--ui-space-3\)/);
  assert.doesNotMatch(css, /\.heading\s*\{/);
  assert.match(css, /\.card \{[^}]*padding: var\(--ui-space-6\)/);
});

test('listing filter, unavailable state and pagination contracts remain intact', () => {
  const page = read('../app/marknaden/stories/page.jsx');
  for (const text of ['validOmxsumStoryFormat(query?.format)', 'fetchOmxsumStories({ symbol, format, cursor: query?.cursor })',
    'Artiklarna kunde inte hämtas', 'Inga publicerade artiklar här ännu', 'result?.nextCursor']) assert.ok(page.includes(text));
});
