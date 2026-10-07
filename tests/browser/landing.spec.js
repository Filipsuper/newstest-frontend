import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const fixtureOrigin = `http://127.0.0.1:${process.env.NEWS_FIXTURE_PORT || 8100}`;

async function setup(
  page,
  user = { email: null, verified: false, plan: "free" },
) {
  const state = { user, writes: [], errors: [], requests: [], mutations: [] };
  page.on("pageerror", (error) => state.errors.push(error.message));
  await page.addInitScript(() => {
    window.EventSource = class extends EventTarget {
      close() {}
    };
  });
  await page.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    state.requests.push(url.pathname);
    if (url.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method()))
      state.mutations.push({ path: url.pathname, method: request.method() });
    if (url.pathname === "/api/user")
      return route.fulfill({ json: state.user });
    if (url.pathname === "/api/mail" && request.method() === "POST") {
      state.writes.push(request.postDataJSON());
      return route.fulfill({ json: { success: true, retryAfter: 60 } });
    }
    if (url.pathname.startsWith("/api/"))
      return route.fulfill({
        response: await route.fetch({
          url: `${fixtureOrigin}${url.pathname}${url.search}`,
        }),
      });
    return ["127.0.0.1", "localhost"].includes(url.hostname)
      ? route.continue()
      : route.abort();
  });
  return state;
}

async function settleTheme(page, theme) {
  await page.evaluate(async (mode) => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) =>
          Number.isFinite(animation.effect?.getComputedTiming().iterations),
        )
        .map((animation) => animation.finished.catch(() => {})),
    );
  }, theme);
}

for (const width of [1440, 390, 320])
  test(`landing ${width}: 2.0 benefits, real previews and accessible light/dark layout`, async ({
    page,
  }, testInfo) => {
    const state = await setup(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const main = page.getByRole("main");
    await expect(main).toHaveCount(1);
    await expect(main.getByRole("heading", { level: 1 })).toHaveText(
      "Förstå börsnyheterna.Följ dina bolag.",
    );
    await expect(
      page.getByRole("link", { name: "OMXsum 2.0 – startsida" }),
    ).toBeVisible();
    await expect(main.getByText("Välkommen till OMXsum 2.0")).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Lär känna bolaget bakom aktien.' })).toBeVisible();
    const research = main.getByRole('region', { name: 'Lär känna bolaget bakom aktien.' });
    await expect(research).toContainText('VD-ord');
    const researchExample = research.getByRole('figure', { name: 'Atlas Copco A, finansiellt exempel' });
    await expect(researchExample.getByRole('link', { name: /Atlas Copco A/ })).toHaveAttribute('href', '/aktie/ATCO-A.ST');
    await expect(researchExample.getByRole('img')).toHaveAccessibleName(/rapporterade helår.*2022:.*2025:/);
    await expect(main.getByRole('link', { name: 'Utforska screenern' })).toHaveAttribute('href', '/aktier/screener');
    await expect(main).toContainText('Terminal ingår i Pro');
    const personal = main.getByRole('region', { name: 'Det viktiga i dina bolag. På ett ställe.' });
    await expect(personal.getByRole('link', { name: 'Öppna Mina bolag' })).toHaveAttribute('href', '/marknaden/bevakning');
    const emailPreview = personal.getByRole('region', { name: 'Förhandsvisning av mejlbevakning' });
    await expect(emailPreview).toContainText('Testa nivån här. Slå på mejlen i Mina bolag.');
    await expect(emailPreview.getByRole('slider', { name: 'Testa olika nyhetsnivåer' })).toHaveAttribute('aria-valuetext', 'Viktiga');
    await emailPreview.getByRole('button', { name: 'Bara viktigast', exact: true }).click();
    await expect(emailPreview.getByRole('slider')).toHaveAttribute('aria-valuetext', 'Bara viktigast');
    await expect(emailPreview.getByRole('note')).toContainText('vinstvarningar');
    expect(state.mutations).toEqual([]);
    await expect(main.getByRole('region', { name: 'Mer bakgrund till det som händer.' })).toHaveCount(0);
    await expect(main).not.toContainText('OMXsum Stories · Kommer snart');
    const feedback = main.getByRole('region', { name: 'Så har läsare reagerat.' });
    await expect(feedback.locator('blockquote')).toHaveCount(3);
    await expect(feedback).toContainText('Läsare om Morgonbrevet · Reddit');
    await expect(feedback.getByRole('link', { name: /Nidalus1s kommentar/ })).toHaveAttribute('href', 'https://www.reddit.com/r/Aktiemarknaden/comments/1j3vtqt/comment/mg45t9i/');
    await expect(feedback.getByRole('link', { name: /3xc1t3rs kommentar/ })).toHaveAttribute('href', 'https://www.reddit.com/r/Aktiemarknaden/comments/1j3vtqt/comment/mghn1ft/');
    await expect(feedback.getByRole('link', { name: /Hampsxs kommentar/ })).toHaveAttribute('href', 'https://www.reddit.com/r/Aktiemarknaden/comments/1j3vtqt/comment/mgb36w4/');
    const plans = main.getByRole('region', { name: 'Börja gratis. Fördjupa dig när du vill.' });
    for (const [name, price] of [['Gratis', 0], ['Plus', 49], ['Pro', 99]]) {
      const plan = plans.getByRole('region', { name: `${name} medlemskap` });
      await expect(plan).toContainText(`${price} kr`);
    }
    await expect(plans.getByRole('region', { name: 'Plus medlemskap' }).getByRole('link', { name: 'Testa 7 dagar gratis' })).toHaveAttribute('href', '/pro#plan-plus');
    await expect(plans.getByRole('region', { name: 'Pro medlemskap' }).getByRole('link', { name: 'Testa 7 dagar gratis' })).toHaveAttribute('href', '/pro#plan-pro');
    await expect(plans).toContainText('utan kort och utan automatisk betalning');
    const faq = main.getByRole('region', { name: 'Bra att veta innan du börjar.' });
    await expect(faq.locator('details')).toHaveCount(6);
    await faq.locator('summary').filter({ hasText: 'Får jag automatiskt mejl när jag följer ett bolag?' }).click();
    await expect(faq.locator('details[open]')).toContainText('Nej. Med Plus eller Pro');
    await expect(faq.locator('details[open]')).toContainText('inte separata mejllarm');
    await faq.locator('summary').filter({ hasText: 'Får jag automatiskt mejl när jag följer ett bolag?' }).click();
    const screenerSection = main.getByRole('region', { name: 'Hitta nästa bolag att läsa på om.' });
    const terminalSection = main.getByRole('region', { name: 'En egen arbetsyta för dig som vill gå längre.' });
    await expect(screenerSection.getByRole('link', { name: 'Utforska screenern' })).toBeVisible();
    const sample = screenerSection.getByRole('list', { name: 'Tre exempel på bolag att utforska' });
    await expect(sample.getByRole('listitem')).toHaveCount(3);
    await expect(sample.getByRole('link', { name: /SAAB B/ })).toHaveAttribute('href', '/aktie/SAAB-B.ST');
    await expect(sample.getByRole('link', { name: /Atlas Copco A/ })).toHaveAttribute('href', '/aktie/ATCO-A.ST');
    await expect(sample.getByRole('link', { name: /Ericsson B/ })).toHaveAttribute('href', '/aktie/ERIC-B.ST');
    await expect(sample).toContainText('20,5%');
    await expect(sample).toContainText('17,3%');
    await expect(sample).toContainText('10,9%');
    await expect(sample.getByRole('listitem').first()).toContainText('Atlas Copco A');
    await expect(screenerSection).toContainText('EBIT-marginal över 10 %');
    await expect(sample.locator('.stock-profile__shape')).toHaveCount(3);
    await expect(sample.locator('[data-company-logo]')).toHaveCount(0);
    await expect(screenerSection.locator('[aria-label^="Bolagsexempel verifierade"]')).toHaveAttribute('aria-label', /rapporterat helår 2025/);
    const rows = await sample.getByRole('listitem').evaluateAll(items => items.map(item => {
      const rect = item.getBoundingClientRect();
      const svg = item.querySelector('.stock-profile').getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, profileWidth: svg.width };
    }));
    expect(rows[1].top - rows[0].bottom).toBe(8);
    expect(rows.every(row => row.profileWidth >= 56)).toBe(true);
    const sampleBox = await sample.boundingBox();
    const sectionBox = await screenerSection.boundingBox();
    if (width > 760) {
      expect(Math.abs(sampleBox.x + sampleBox.width - sectionBox.x - sectionBox.width)).toBeLessThan(1);
    } else {
      expect(Math.abs(sampleBox.x - sectionBox.x)).toBeLessThan(1);
    }
    await expect(screenerSection).not.toContainText('Tre vägar till nya bolag');
    await expect(screenerSection).not.toContainText('Exempel från 3 okt. 2026');
    await expect(screenerSection).not.toContainText('Saknas');
    await expect(screenerSection).not.toContainText('Källor');
    await expect(screenerSection.getByRole('table')).toHaveCount(0);
    await expect(screenerSection.getByRole('button', { name: 'EBIT-marginal över 10 %' })).toHaveCount(0);
    expect(state.requests.some(path => path === '/api/feed/screener-preview')).toBe(false);
    await screenerSection.screenshot({ path: testInfo.outputPath(`landing-screener-${width}.png`) });
    await expect(screenerSection).not.toContainText('Terminal');
    await expect(terminalSection.getByRole('link', { name: 'Upptäck Terminal' })).toBeVisible();
    await expect(terminalSection.getByRole('tab', { name: 'Trading', exact: true })).toHaveAttribute('aria-selected', 'true');
    await terminalSection.getByRole('tab', { name: 'Bolagsanalys', exact: true }).click();
    await expect(terminalSection.getByRole('img')).toHaveAttribute('alt', /Swecos/);
    await expect(terminalSection.getByRole('img')).toHaveAttribute('width', '2940');
    await expect(terminalSection.getByRole('img')).toHaveAttribute('height', '1598');
    await expect(terminalSection).toContainText('Skärmbild 6 okt. 2026. Visar inte aktuella kurser.');
    await expect(terminalSection.getByRole('link', { name: 'Visa större bild av Terminal (öppnas i ny flik)' })).toHaveAttribute('href', /terminal-financials-2026-10-06/);
    await terminalSection.getByRole('tab', { name: 'Trading', exact: true }).click();
    await expect(terminalSection.getByRole('img')).toHaveAttribute('alt', /Better Collectives/);
    const screenerBox = await screenerSection.boundingBox();
    const terminalBox = await terminalSection.boundingBox();
    expect(terminalBox.y).toBeGreaterThanOrEqual(screenerBox.y + screenerBox.height + (width > 760 ? 112 : 64));
    await expect(main).toContainText('Följ upp till 2 bolag med ett gratis konto');
    const news = main.getByRole("region", { name: "Ur Marknaden" });
    await expect(news.locator("article")).toHaveCount(2);
    await expect(news.locator('article[data-news-layout="editorial"]')).toHaveCount(2);
    await expect(news.getByLabel('Kort AI-sammanfattning')).toHaveCount(2);
    await expect(news).not.toContainText("AI-sammanfattning");
    await expect(news.locator('[data-news-header] a[href^="/aktie/"]')).toHaveCount(2);
    await expect(news.getByRole('link', { name: 'Läs nyheten', exact: true })).toHaveCount(2);
    await expect(news.getByRole('listitem')).toHaveCount(0);
    await expect(news).toContainText("Ur Marknadens nyhetsurval.");
    await expect(news).toContainText("Källor och mätperiod finns i nyheten.");
    await expect(
      main.getByRole("textbox", { name: "E-postadress" }),
    ).toHaveCount(1);
    await expect(
      main.locator("article").filter({ hasText: "Läs brevet →" }),
    ).toHaveCount(1);
    const hero = main.locator(":scope > header");
    const letter = hero.getByRole("region", { name: "Senaste brevet" });
    await expect(letter.locator("article")).toHaveCount(1);
    await expect(letter.locator("article time")).toHaveAttribute(
      "datetime",
      /T/,
    );
    await expect(
      hero.getByRole("region", { name: "Ur Marknaden" }),
    ).toHaveCount(0);
    const heroCopy = await hero.locator(":scope > div").boundingBox();
    const letterBox = await letter.boundingBox();
    if (width > 760) {
      expect(letterBox.x).toBeGreaterThan(heroCopy.x + heroCopy.width);
      expect(letterBox.y).toBeLessThan(heroCopy.y + heroCopy.height);
    } else {
      expect(letterBox.y).toBeGreaterThanOrEqual(
        heroCopy.y + heroCopy.height + 32,
      );
    }
    const sectionBoxes = await main
      .locator(":scope > header, :scope > section")
      .evaluateAll((sections) =>
        sections.map((section) => {
          const { top, bottom } = section.getBoundingClientRect();
          return { top, bottom };
        }),
      );
    for (let index = 1; index < sectionBoxes.length; index++)
      expect(
        sectionBoxes[index].top - sectionBoxes[index - 1].bottom,
      ).toBeGreaterThanOrEqual(width > 760 ? 112 : 64);
    expect(
      state.requests.some(
        (path) =>
          path === "/api/feed/news" || path === "/api/user/personal-feed",
      ),
    ).toBe(false);
    expect(state.writes).toEqual([]);
    expect(state.requests).not.toContain('/api/user/company-alerts');
    expect(state.requests).not.toContain('/api/user/trial');
    for (const theme of ["light", "dark"]) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await settleTheme(page, theme);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const target of await main.getByRole("button").all())
        expect((await target.boundingBox()).height).toBeGreaterThanOrEqual(44);
      expect(
        (
          await new AxeBuilder({ page })
            .include("main")
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`landing-${width}-${theme}.png`),
        fullPage: true,
        animations: "disabled",
      });
    }
    await main.getByRole("link", { name: "Få Morgonbrevet gratis" }).click();
    await expect(page).toHaveURL(/\/#kom-igang$/);
    await expect(page.locator("#kom-igang")).toBeFocused();
    expect(state.errors).toEqual([]);
  });

test('public newsletter signup is usable before the account request resolves', async ({ page }) => {
  const state = await setup(page);
  let release, accountRequested = false;
  const responseReady = new Promise(resolve => { release = resolve; });
  await page.route('**/api/user', async route => {
    accountRequested = true;
    await responseReady;
    return route.fulfill({ json: state.user });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => accountRequested).toBe(true);
  const hero = page.locator('#kom-igang');
  await expect(hero.getByRole('textbox', { name: 'E-postadress' })).toBeVisible();
  await expect(hero.getByRole('button', { name: 'Prenumerera', exact: true })).toBeEnabled();
  await expect(hero).not.toContainText('Hämtar ditt konto');
  await hero.getByRole('textbox', { name: 'E-postadress' }).fill('slow-account@example.test');
  await hero.getByRole('button', { name: 'Prenumerera', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Kolla din inkorg' })).toBeVisible();
  expect(state.writes).toEqual([{ mail: 'slow-account@example.test', website: '' }]);
  expect(state.mutations).toEqual([{ path: '/api/mail', method: 'POST' }]);
  release();
});

test('landing trial links reflect confirmed eligibility and never activate a trial', async ({ page }) => {
  const state = await setup(page, {
    email: 'trial-reader@example.test', verified: true, plan: 'free',
    trial: { status: 'unused', eligible: true },
  });
  await page.goto('/');
  const plans = page.getByRole('region', { name: 'Börja gratis. Fördjupa dig när du vill.' });
  await expect(plans.getByRole('link', { name: 'Testa 7 dagar gratis', exact: true })).toHaveCount(2);
  for (const user of [
    { email: 'trial-reader@example.test', verified: false, plan: 'free', trial: { status: 'unused', eligible: true } },
    { email: 'trial-reader@example.test', verified: true, plan: 'free', trial: { status: 'expired', eligible: false } },
    { email: 'trial-reader@example.test', verified: true, plan: 'plus', trial: { status: 'active', eligible: false } },
    { email: 'trial-reader@example.test', verified: true, plan: 'premium' },
  ]) {
    state.user = user;
    await page.reload();
    await expect(plans.getByRole('link', { name: 'Testa 7 dagar gratis', exact: true })).toHaveCount(0);
    await expect(plans.getByRole('link', { name: 'Se Plus', exact: true })).toHaveAttribute('href', '/pro#plan-plus');
    await expect(plans.getByRole('link', { name: 'Se Pro', exact: true })).toHaveAttribute('href', '/pro#plan-pro');
  }
  expect(state.mutations).toEqual([]);
  expect(state.requests).not.toContain('/api/user/trial');
});

test("landing story examples use the real reader and retain Back/Forward/focus behavior", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/");
  await expect(page.getByRole('button', { name: 'Logga in', exact: true })).toBeVisible();
  const news = page.getByRole("region", { name: "Ur Marknaden" });
  const headline = news.locator('article a[href^="/nyhet/"]').first();
  const href = await headline.getAttribute("href");
  await headline.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("AI-sammanfattning");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/$/);
  await expect(headline).toBeFocused();
  await page.goForward();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("main").getByRole("heading", { level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

test("returning readers get workspace actions without assuming newsletter subscription", async ({
  page,
}) => {
  const state = await setup(page, {
    email: "reader@example.test",
    verified: true,
    plan: "premium",
    watchlist: ["NORD.TEST"],
  });
  await page.goto("/");
  const hero = page.locator("#kom-igang");
  await expect(
    hero.getByRole("link", { name: "Öppna Mina bolag" }),
  ).toHaveAttribute("href", "/marknaden/bevakning");
  await expect(hero.getByRole("textbox")).toHaveCount(0);
  await expect(
    page
      .getByRole("region", { name: "En enklare start på börsdagen." })
      .getByRole("textbox", { name: "E-postadress" }),
  ).toBeVisible();
  state.user = {
    ...state.user,
    plan: "free",
    watchlist: [],
    topics: [],
    keywords: [],
  };
  await page.reload();
  await expect(
    hero.getByRole("link", { name: "Öppna Marknaden" }),
  ).toHaveAttribute("href", "/marknaden");
  await expect(
    hero.getByRole("link", { name: "Välj bolag att följa" }),
  ).toHaveAttribute("href", "/kom-igang");
  expect(state.writes).toEqual([]);
});

test("new landing signup retains the single confirmation dialog", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/");
  await page
    .getByRole("main")
    .getByRole("textbox", { name: "E-postadress" })
    .fill("reader@example.test");
  await page.getByRole("button", { name: "Prenumerera", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Kolla din inkorg" }),
  ).toBeVisible();
  expect(state.writes).toEqual([{ mail: "reader@example.test", website: "" }]);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("main").getByRole("textbox", { name: "E-postadress" }),
  ).toBeFocused();
});

test("landing metadata describes news and reactions; social image carries 2.0 without fabricated market figures", async ({
  page,
  request,
}, testInfo) => {
  await setup(page);
  await page.goto("/");
  await expect(page).toHaveTitle("Börsnyheter och kursreaktioner – följ dina bolag | OMXsum");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://omxsum.com",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://omxsum.com/og/home?v=20260907-news",
  );
  const structured = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  expect(JSON.parse(structured)["@graph"][1].name).toBe("OMXsum 2.0");
  const image = await request.get("/og/home");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
  const png = await image.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
  await testInfo.attach("omxsum-2-social", {
    body: png,
    contentType: "image/png",
  });
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto("/og/home");
  await expect(page.locator("img")).toHaveJSProperty("naturalWidth", 1200);
  await page.locator("img").screenshot({
    path: testInfo.outputPath("omxsum-2-social.png"),
  });
});
