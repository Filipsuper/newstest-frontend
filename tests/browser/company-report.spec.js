import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { window.EventSource = class extends EventTarget { close() {} }; });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) return route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:8100${url.pathname}${url.search}` }) });
    if (["127.0.0.1", "localhost"].includes(url.hostname)) return route.continue();
    return route.abort();
  });
});

const nav = page => page.getByRole("navigation", { name: "Bolagsavsnitt", exact: true });
const privateRequests = page => {
  const requests = [];
  page.on("request", request => { if (/\/api\/feed\/company\/[^/]+\/(insiders|shorts|valuation)/.test(request.url())) requests.push(new URL(request.url()).pathname); });
  return requests;
};
const belowChrome = async (page, id) => {
  // A streamed route transition can briefly retain the outgoing section.
  // Assert uniqueness once navigation settles before measuring its position.
  await expect(page.locator(`#${id}`)).toHaveCount(1);
  await expect.poll(() => page.locator(`#${id}`).evaluate(element => {
    const offset = parseFloat(getComputedStyle(element).getPropertyValue("--report-offset"));
    return Math.abs(element.getBoundingClientRect().top - offset);
  })).toBeLessThan(12);
};

test("desktop report uses one chart, persistent sections and on-demand research", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const requests = privateRequests(page), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/aktie/NORD.TEST");
  await expect(page.locator("[data-report-section]")).toHaveCount(8);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(nav(page)).toBeVisible();
  await expect(page.locator(".company-chart")).toHaveCount(1);
  expect(requests).toEqual([]);
  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => document.documentElement.classList.toggle("dark", theme === "dark"), theme);
    await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getComputedTiming().iterations)).map(animation => animation.finished.catch(() => {}))); });
    const audit = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(audit.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`company-${theme}-desktop.png`) });
  }
  await nav(page).getByRole("link", { name: "Finansiellt", exact: true }).click();
  await expect(page).toHaveURL(/#financials$/);
  await belowChrome(page, "financials");
  await page.getByRole("button", { name: "Kvartal", exact: true }).click();
  await page.getByText("Alla nyckeltal och rapporterade siffror", { exact: true }).click();
  await expect(page.getByRole("region", { name: "Finansiella nyckeltal, rulla i sidled" })).toBeVisible();
  await nav(page).getByRole("link", { name: "Nyheter & reaktioner" }).click();
  await expect(nav(page).getByRole("link", { name: "Nyheter & reaktioner" })).toHaveAttribute("aria-current", "location");
  await nav(page).getByRole("link", { name: "Finansiellt", exact: true }).click();
  await expect(page.getByRole("button", { name: "Kvartal", exact: true })).toHaveAttribute("aria-pressed", "true");
  await nav(page).getByRole("link", { name: "Insyn & ägare" }).click();
  await expect.poll(() => requests.filter(request => request.endsWith("/insiders")).length).toBe(1);
  await nav(page).getByRole("link", { name: "Översikt", exact: true }).click();
  await expect(page.locator(".company-chart")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("legacy links, section reload and reader Back/Forward preserve chart and reading position", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/aktie/NORD.TEST?tab=news&range=6m&ma=50");
  await expect(page).toHaveURL(/range=6m&ma=50#news$/);
  await belowChrome(page, "news");
  await expect(page.getByRole("button", { name: "6 mån", exact: true })).toHaveAttribute("aria-pressed", "true");
  const article = page.locator('#news article a[href="/nyhet/fixture-3"]');
  await article.scrollIntoViewIfNeeded();
  await article.focus();
  const position = await page.evaluate(() => scrollY);
  const original = page.url();
  await article.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(original);
  await expect(article).toBeFocused();
  await expect.poll(() => page.evaluate(y => Math.abs(scrollY - y), position)).toBeLessThan(4);
  await page.goForward();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(original);
  await nav(page).getByRole("link", { name: "Blankning", exact: true }).click();
  await belowChrome(page, "shorts");
  await page.reload();
  await belowChrome(page, "shorts");
});

for (const width of [320, 390, 820]) test(`mobile ${width}: contents sheet jumps instead of hiding panels; page scrolls normally`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/aktie/NORD.TEST");
  const trigger = page.getByRole("button", { name: "Avsnitt", exact: true });
  await expect(trigger).toBeVisible();
  expect((await trigger.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("link", { name: "Nyheter & reaktioner" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await belowChrome(page, "news");
  await expect(page.locator("#news-heading")).toBeFocused();
  await expect(page.locator("[data-report-section]")).toHaveCount(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const before = await page.evaluate(() => scrollY);
  await page.mouse.move(width / 2, 550);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 100);
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath(`company-${width}-news.png`) });
  await trigger.click();
  await page.getByRole("dialog").getByRole("link", { name: "Finansiellt", exact: true }).click();
  await belowChrome(page, "financials");
  await page.getByText("Alla nyckeltal och rapporterade siffror", { exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`company-${width}-financials.png`) });
});

test("news is bounded, chronological and deduplicated; intraday loading has no synthetic curve", async ({ page }) => {
  await page.goto("/aktie/MANY.TEST#news");
  await expect(page.locator("#news article")).toHaveCount(6);
  await expect(page.locator('#news a[href="/nyhet/fixture-0"]')).toHaveCount(1);
  await expect(page.locator('#news a[href="/nyhet/duplicate-release"]')).toHaveCount(0);
  await expect(page.locator("#news article").first()).toContainText("Fiktiv AI-text");
  await expect(page.locator("#news article").first().getByRole("listitem")).toHaveCount(3);
  await page.getByRole("button", { name: "Visa fler nyheter" }).click();
  await expect(page.locator("#news article")).toHaveCount(12);
  await page.getByRole("button", { name: "Visa fler nyheter" }).click();
  await expect(page.locator("#news article")).toHaveCount(18);
  await expect(page.getByRole("button", { name: "Visa fler nyheter" })).toHaveCount(0);
  await nav(page).getByRole("link", { name: "Översikt", exact: true }).click();
  await page.getByRole("button", { name: "1 dag", exact: true }).click();
  await expect(page).toHaveURL(/range=1d#overview$/);
  await expect(page.locator(".company-chart .recharts-line-curve")).toHaveCount(0);
  await page.getByRole("button", { name: "1 år", exact: true }).click();
  await page.getByRole("button", { name: "Diagraminställningar", exact: true }).click();
  await page.getByRole("checkbox", { name: "MA50", exact: true }).check();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Diagraminställningar", exact: true })).toBeFocused();
  await expect(page).toHaveURL(/ma=50#overview$/);
  await page.getByRole("button", { name: "Dela aktien", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Kopiera länk" })).toBeVisible();
  await expect(page.getByRole("dialog").locator('img[src*="/og/aktie"]')).toHaveAttribute("src", /range=1y&ma=50&v=3$/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Dela aktien", exact: true })).toBeFocused();
});

test("server access prevents private requests while news/calendar remain usable; empty and error states are honest", async ({ page }) => {
  const requests = privateRequests(page);
  await page.goto("/aktie/FREE.TEST?tab=insiders");
  await expect(page.locator("#insiders")).toContainText("ingår i Plus");
  await expect(page.locator("#financials")).toContainText("Omsättning");
  await expect(page.locator("#financials")).toContainText("120 M SEK");
  await expect(page.locator("#financials summary")).toContainText("Bolagsprofil · sex perspektiv");
  await nav(page).getByRole("link", { name: "Kalender", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Rapporter och kapitalhändelser" })).toBeVisible();
  expect(requests).toEqual([]);
  await page.goto("/aktie/FJALL.TEST");
  await expect(page.locator("main:visible").getByText("Ingen historisk kursdata är tillgänglig ännu.")).toBeVisible();
  await expect(page.locator("#news article")).not.toHaveCount(0);
  await page.goto("/aktie/MISSING.TEST");
  await expect(page.locator("main:visible").getByText("Aktien kunde inte hittas", { exact: true })).toBeVisible();
  await page.goto("/aktie/UNAVAILABLE.TEST");
  await expect(page.locator("main:visible").getByText("Bolagssidan kunde inte hämtas", { exact: true })).toBeVisible();
});
