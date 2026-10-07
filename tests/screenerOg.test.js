import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SCREENER_OG_IMAGE, SITE_OG_IMAGE } from '../app/utils/brand.js';
import { polarPoint, smoothClosedPath } from '../app/utils/profileRadarGeometry.js';
import { LANDING_SCREENER_EXAMPLE } from '../app/utils/landingScreener.js';

test('screener has its own versioned artwork without replacing generic site metadata', async () => {
  assert.equal(SCREENER_OG_IMAGE.width, 1200);
  assert.equal(SCREENER_OG_IMAGE.height, 630);
  assert.match(SCREENER_OG_IMAGE.url, /^\/og\/screener\?v=\d{8}-results$/);
  assert.equal(SITE_OG_IMAGE.url, '/og/home?v=20260907-news');
  const source = await readFile(new URL('../app/aktier/screener/page.jsx', import.meta.url), 'utf8');
  assert.match(source, /openGraph:/);
  assert.match(source, /twitter:/);
  assert.equal((source.match(/images: \[SCREENER_OG_IMAGE\]/g) || []).length, 2);
  assert.match(source, /canonical: "\/aktier\/screener"/);
});

test('static profile geometry keeps the actual UI curve and filled zero-score minimum', () => {
  assert.deepEqual(polarPoint(0, 53), { x: 95, y: 42 });
  assert.deepEqual(polarPoint(3, 53), { x: 95, y: 148 });
  assert.equal(smoothClosedPath([]), '');
  for (const row of LANDING_SCREENER_EXAMPLE.items) {
    const points = row.profile.axes.map((axis, index) => polarPoint(index, 53 * (0.14 + (axis.score / 5) * 0.86)));
    const path = smoothClosedPath(points);
    assert.ok(!path.includes('NaN'));
    assert.equal((path.match(/ C /g) || []).length, 6);
    assert.ok(path.endsWith(' Z'));
    for (const [index, axis] of row.profile.axes.entries()) {
      if (axis.score === 0) assert.ok(Math.abs(Math.hypot(points[index].x - 95, points[index].y - 95) - 7.42) < 1e-10);
    }
  }
});

test('OG renderer uses dated public examples and bundled fonts without live/private requests', async () => {
  const source = await readFile(new URL('../app/og/screener/route.jsx', import.meta.url), 'utf8');
  assert.match(source, /force-static/);
  assert.match(source, /LANDING_SCREENER_EXAMPLE/);
  assert.match(source, /loadOgFonts/);
  assert.match(source, /smoothClosedPath/);
  assert.match(source, /Helår 2025/);
  assert.match(source, /ogDate\(example.capturedAt/);
  assert.match(source, /Exempel/);
  assert.doesNotMatch(source, /fetch\(|process\.env|request\.url|searchParams/);
});
