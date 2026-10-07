import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { SCREENER_OG_IMAGE, SITE_OG_IMAGE } from '../../app/utils/brand';

test('screener crawler metadata points to dedicated artwork; homepage keeps site image', async ({ request }) => {
  for (const [path, config] of [['/aktier/screener', SCREENER_OG_IMAGE], ['/', SITE_OG_IMAGE]]) {
    const response = await request.get(path, { headers: { 'user-agent': 'Twitterbot/1.0' } });
    expect(response.status()).toBe(200);
    const html = await response.text();
    for (const attribute of ['property="og:image"', 'name="twitter:image"']) {
      const raw = html.match(new RegExp(`${attribute} content="([^"]+)"`))[1];
      const image = new URL(raw.replaceAll('&amp;', '&'));
      expect(image.pathname + image.search).toBe(config.url);
    }
    expect(html).toContain(`rel="canonical" href="https://omxsum.com${path === '/' ? '' : path}"`);
  }
});

test('screener share artwork renders a readable 1200×630 image and thumbnail', async ({ request, page }, testInfo) => {
  const response = await request.get(SCREENER_OG_IMAGE.url);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('image/png');
  expect(response.headers()['cache-control']).toContain('public');
  const png = await response.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
  await writeFile(testInfo.outputPath('screener-og.png'), png);
  await testInfo.attach('screener-og', { body: png, contentType: 'image/png' });
  await page.setContent(`<img src="data:image/png;base64,${png.toString('base64')}" alt="Screener share image" style="width:600px;height:315px" />`);
  const colors = await page.locator('img').evaluate(async image => {
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 630;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, 1200, 630).data;
    const counts = {};
    let greenProfilePixels = 0, yellowProfilePixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      const key = [...data.slice(i, i + 3)].join(',');
      counts[key] = (counts[key] || 0) + 1;
      const x = (i / 4) % 1200, y = Math.floor(i / 4 / 1200);
      // Rotated SVG edges are antialiased and their fills are translucent.
      // Measure the actual profile area, not exact opaque stroke pixels.
      if (x >= 630 && x < 780 && y >= 240 && y < 525) {
        const [r, g, b] = data.slice(i, i + 3);
        if (g > r + 12 && g > b + 8) greenProfilePixels += 1;
        if (r > g + 8 && g > b + 20) yellowProfilePixels += 1;
      }
    }
    return { corner: [...data.slice(0, 3)].join(','), counts, greenProfilePixels, yellowProfilePixels };
  });
  expect(colors.corner).toBe('246,245,241');
  expect(colors.counts['34,37,31']).toBeGreaterThan(40000);
  expect(colors.greenProfilePixels).toBeGreaterThan(200);
  expect(colors.yellowProfilePixels).toBeGreaterThan(200);
  await page.locator('img').screenshot({ path: testInfo.outputPath('screener-og-thumbnail.png') });
  const repeated = await request.get(SCREENER_OG_IMAGE.url);
  expect(await repeated.body()).toEqual(png);
});
