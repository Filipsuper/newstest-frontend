import { test, expect } from '@playwright/test';

test('seven-day important selection is separate from the recent chronological page', async ({ page, request }) => {
  const fixture = await (await request.get('http://127.0.0.1:8100/api/user/personal-feed')).json();
  const old = { ...fixture.stories[0], id: 'older-important', eventId: 'older-important', importance: 99,
    headline: 'Viktig order för fem dagar sedan', publishedAt: new Date(Date.now() - 5 * 86400e3).toISOString(),
    readState: { status: 'unread', receipt: 'old-receipt' } };
  let read = false;
  await page.route('**/api/user/personal-feed**', route => {
    if (route.request().method() === 'POST') {
      read = true;
      return route.fulfill({ json: { acknowledged: ['old-receipt'] } });
    }
    return route.fulfill({ json: { ...fixture, sinceHours: 168, importantStories: [{ ...old, readState: { ...old.readState, status: read ? 'read' : 'unread' } }],
      importantCoverage: { complete: false }, nextCursor: null } });
  });
  await page.goto('/marknaden/bevakning');
  await expect(page.getByText(/Uppdateras automatiskt · Senaste 7 dagarna/)).toBeVisible();
  const important = page.getByRole('region', { name: 'Viktigt i dina bolag' });
  await expect(important).toContainText(old.headline);
  await expect(important).toContainText('Urvalet är ofullständigt');
  await expect(page.getByRole('region', { name: 'Bolag för bolag' })).not.toContainText(old.headline);
  await important.getByRole('button', { name: 'Markera som läst' }).click();
  await expect(important).not.toContainText(old.headline);
});

test('story modal preserves the background personal filter through close and forward', async ({ page }) => {
  await page.goto('/marknaden/bevakning?filter=companies');
  const filters = page.locator('[aria-label="Filtrera bevakning"]');
  const selected = filters.locator('button[data-pressed]');
  await expect(selected).toHaveText('Bolag');
  const first = page.locator('main article').first();
  await expect(first).toBeVisible();
  const headline = await first.locator('a').first().textContent();
  await first.locator('a').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/\/nyhet\//);
  await expect(selected).toHaveText('Bolag');
  await expect(page.locator('main article').first()).toContainText(headline);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/filter=companies/);
  await expect(selected).toHaveText('Bolag');
  await page.goForward();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(selected).toHaveText('Bolag');
});

test('story modal preserves the chronological feed selection and scope', async ({ page }) => {
  await page.goto('/marknaden/nyheter?selection=all&scope=following');
  const selection = page.locator('[aria-label="Nyhetsurval"] button[data-pressed]');
  await expect(selection).toHaveText('Alla');
  await page.locator('main article').first().locator('a').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(selection).toHaveText('Alla');
  await expect(page.locator('main button[data-pressed]').filter({ hasText: /^Mina bolag$/ })).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(selection).toHaveText('Alla');
});

for (const width of [1440, 390]) {
  test(`personal filter tabs keep their positions while loading at ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 900 });
    const fixture = await (await request.get('http://127.0.0.1:8100/api/user/personal-feed')).json();
    let release;
    let delayed = false;
    await page.route('**/api/user/personal-feed**', async route => {
      if (delayed) await new Promise(resolve => { release = resolve; });
      await route.fulfill({ json: { ...fixture, readStateAvailable: true } });
    });
    await page.goto('/marknaden/bevakning');
    await expect(page.locator('article').first()).toBeVisible();
    const tabs = page.getByRole('group', { name: 'Filtrera bevakning' });
    await tabs.scrollIntoViewIfNeeded();
    const positions = () => tabs.getByRole('button').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect();
      const parent = node.parentElement.getBoundingClientRect();
      return { label: node.textContent, x: rect.x - parent.x, y: rect.y - parent.y, width: rect.width, height: rect.height };
    }));
    const before = await positions();
    delayed = true;
    await tabs.getByRole('button', { name: 'Bolag', exact: true }).click();
    await expect.poll(() => Boolean(release)).toBe(true);
    expect(await positions()).toEqual(before);
    delayed = false;
    release();
    await expect(page.locator('article').first()).toBeVisible();
    expect(await positions()).toEqual(before);
  });
}

test('explicit read actions survive reload; a failed write does not hide unread news', async ({ page, request }) => {
  const fixture = await (await request.get('http://127.0.0.1:8100/api/user/personal-feed')).json();
  let read = false, fail = true, writes = 0;
  const story = fixture.stories[0];
  await page.route('**/api/user/personal-feed**', route => {
    if (route.request().method() === 'POST') {
      writes++;
      if (fail) return route.fulfill({ status: 503, json: { error: 'Unavailable' } });
      read = true;
      return route.fulfill({ json: { acknowledged: ['fixture-receipt'] } });
    }
    return route.fulfill({ json: { stories: [{ ...story, readState: { status: read ? 'read' : 'unread', receipt: 'fixture-receipt' } }], readStateAvailable: true, coverage: { complete: true } } });
  });
  await page.goto('/marknaden/bevakning?filter=new');
  await expect(page.getByRole('button', { name: 'Markera som läst', exact: true })).toBeVisible();
  const readAction = page.locator('article').getByRole('button', { name: 'Markera som läst', exact: true });
  await expect(readAction).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const card = await page.locator('article').boundingBox();
    const action = await readAction.boundingBox();
    expect(action.x).toBeGreaterThanOrEqual(card.x);
    expect(action.x + action.width).toBeLessThanOrEqual(card.x + card.width);
    expect(action.y + action.height).toBeLessThanOrEqual(card.y + card.height);
  }
  await page.reload();
  expect(writes).toBe(0);
  await page.getByRole('button', { name: 'Markera som läst', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Lässtatus kunde inte sparas' })).toBeVisible();
  await expect(page.locator('article')).toHaveCount(1);
  fail = false;
  await page.getByRole('button', { name: 'Markera som läst', exact: true }).click();
  await expect(page.locator('article')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Inga olästa nyheter i det hämtade urvalet', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Visa alla matchningar' }).click();
  await expect(page.getByText('Läst', { exact: true }).first()).toBeVisible();
});

test('selection and company scope filter chronological rows and survive reload', async ({ page, request }) => {
  const fixture = await (await request.get('http://127.0.0.1:8100/api/feed/news')).json();
  const items = [
    { ...fixture.items[0], id: 'routine', eventId: 'routine', facts: {}, headline: 'Inbjudan till årsstämma', importance: 99 },
    { ...fixture.items[1], id: 'other', eventId: 'other', facts: {}, headline: 'Stor order hos annat bolag', importance: 90 },
    { ...fixture.items[0], id: 'mine', eventId: 'mine', facts: {}, headline: 'Viktig order hos mitt bolag', importance: 80 },
  ];
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route('**/api/feed/news?*', route => route.fulfill({ json: { items, nextCursor: null } }));
  await page.goto('/marknaden/nyheter');
  const feed = page.getByRole('region', { name: 'Nyhetsflöde', exact: true });
  await expect(feed.locator('article')).toHaveCount(2);
  await feed.getByRole('button', { name: 'Mina bolag', exact: true }).click();
  await expect(feed.locator('article')).toHaveCount(1);
  await expect(feed.locator('article')).toContainText('Viktig order hos mitt bolag');
  await feed.getByRole('group', { name: 'Nyhetsurval' }).getByRole('button', { name: 'Alla', exact: true }).click();
  await expect(feed.locator('article')).toHaveCount(2);
  await expect(page).toHaveURL(/selection=all/);
  await page.reload();
  await expect(feed.locator('article')).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('search hands off to lexical watch preview before an explicit save', async ({ page }) => {
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  let previews = 0, saves = 0;
  await page.route('**/api/user/keyword-preview', route => {
    previews++;
    expect(route.request().postDataJSON().keyword).toBe('orderingång');
    return route.fulfill({ json: { readOnly: true, items: [{ id: 'fixture-0', headline: 'Högre orderingång', matchField: 'headline' }], coverage: { complete: true } } });
  });
  await page.route('**/api/user/keywords', route => { saves++; return route.fulfill({ json: { keywords: ['orderingång'] } }); });
  await page.goto('/marknaden/nyheter?q=orderingång');
  await page.getByRole('button', { name: 'Bevaka sökord', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Anpassa bevakning', exact: true });
  await expect(dialog.getByRole('textbox', { name: 'Nytt nyckelord' })).toHaveValue('orderingång');
  expect(saves).toBe(0);
  await dialog.getByRole('button', { name: 'Förhandsvisa matchningar' }).click();
  await expect(dialog.getByRole('link', { name: 'Högre orderingång' })).toBeVisible();
  expect(previews).toBe(1);
  expect(saves).toBe(0);
  await dialog.getByRole('button', { name: 'Lägg till', exact: true }).click();
  await expect.poll(() => saves).toBe(1);
});
