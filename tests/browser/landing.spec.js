import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function setup(
  page,
  user = { email: null, verified: false, plan: "free" },
) {
  const state = { user, writes: [], errors: [], requests: [] };
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
    if (url.pathname === "/api/user")
      return route.fulfill({ json: state.user });
    if (url.pathname === "/api/mail" && request.method() === "POST") {
      state.writes.push(request.postDataJSON());
      return route.fulfill({ json: { success: true, retryAfter: 60 } });
    }
    if (url.pathname.startsWith("/api/"))
      return route.fulfill({
        response: await route.fetch({
          url: `http://127.0.0.1:8100${url.pathname}${url.search}`,
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
      "Förstå nyheterna.Följ dina bolag.",
    );
    await expect(
      page.getByRole("link", { name: "OMXsum 2.0 – startsida" }),
    ).toBeVisible();
    await expect(main.getByText("Välkommen till OMXsum 2.0")).toBeVisible();
    const news = main.getByRole("region", { name: "Ur Marknaden" });
    await expect(news.locator("article")).toHaveCount(2);
    await expect(news).toContainText("AI-sammanfattning");
    await expect(news).toContainText("Sedan publicering");
    await expect(news).toContainText("Ett urval, inte hela nyhetsflödet");
    await expect(
      main.getByRole("textbox", { name: "E-postadress" }),
    ).toHaveCount(1);
    await expect(
      main.getByText("Med Plus får Morgonbrevet också en personlig del", {
        exact: false,
      }),
    ).toBeVisible();
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
    for (const theme of ["light", "dark"]) {
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

test("landing story examples use the real reader and retain Back/Forward/focus behavior", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/");
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
    hero.getByRole("link", { name: "Öppna min bevakning" }),
  ).toHaveAttribute("href", "/bevakning");
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
  ).toHaveAttribute("href", "/bevakning/hantera");
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

test("landing metadata and social image carry 2.0 without fabricated market figures", async ({
  page,
  request,
}, testInfo) => {
  await setup(page);
  await page.goto("/");
  await expect(page).toHaveTitle("OMXsum 2.0 – Börsnyheter med sammanhang");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://omxsum.com",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://omxsum.com/og/home",
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
