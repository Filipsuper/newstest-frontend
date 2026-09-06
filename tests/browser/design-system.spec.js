import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const stories = [
  {
    id: "report",
    headline: "Orderingången över förväntan",
    companies: [{ name: "Atlas Copco", symbol: "ATCO-A.ST" }],
    publishedAt: "2026-09-04T09:00:00Z",
    tags: ["EARNINGS"],
    reaction: { pct: 2.4 },
    status: "flash",
  },
  {
    id: "order",
    headline: "Ny stororder på elektriska lastbilar",
    companies: [{ name: "Volvo", symbol: "VOLV-B.ST" }],
    publishedAt: "2026-09-04T08:00:00Z",
    tags: ["ORDER"],
    reaction: { pct: 4.2 },
    status: "flash",
  },
  {
    id: "insider",
    headline: "Rapporterad insynstransaktion",
    companies: [{ name: "Exempelbolaget", symbol: "EXAMPLE.ST" }],
    publishedAt: "2026-09-04T07:00:00Z",
    tags: ["INSIDER"],
    status: "flash",
  },
];

test.beforeEach(async ({ page }) => {
  // Isolate frontend behavior. No real account, alert, analytics or API writes.
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/user"))
      return route.fulfill({
        json: {
          email: "ui-test@example.test",
          verified: true,
          plan: "premium",
          watchlist: [],
        },
      });
    if (url.pathname.endsWith("/feed/news"))
      return route.fulfill({
        json: { items: url.searchParams.get("q") === "none" ? [] : stories },
      });
    if (url.pathname.endsWith("/feed/stream"))
      return route.fulfill({
        contentType: "text/event-stream",
        body: "retry: 60000\n\nevent: ready\ndata: {}\n\n",
      });
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost")
      return route.continue();
    return route.abort();
  });
});

test("gallery renders in both themes with no runtime errors", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (event) => {
    if (
      event.type() === "error" &&
      /hydration|hydrated|Base UI|React/i.test(event.text())
    )
      errors.push(event.text());
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/designsystem");
  await expect(
    page.getByRole("heading", { name: "En gemensam grund." }),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Exempelnyheter" }).getByRole("listitem"),
  ).toHaveCount(3);
  await page.screenshot({
    path: testInfo.outputPath("gallery-light-desktop.png"),
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Växla ljust eller mörkt tema" })
    .click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({
    path: testInfo.outputPath("gallery-dark-desktop.png"),
    animations: "disabled",
  });
  expect(errors).toEqual([]);
});

test("news pattern filters, searches and opens details without nested buttons", async ({
  page,
}) => {
  await page.goto("/designsystem");
  const list = page.getByRole("list", { name: "Exempelnyheter" });
  await page.getByRole("button", { name: "För dig", exact: true }).click();
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "För dig", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("textbox", { name: "Sök i exempelflödet" })
    .fill("volvo");
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await list.getByRole("button").click();
  await expect(page.getByRole("dialog", { name: "Volvo" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(list.getByRole("button")).toBeFocused();
  expect(await page.locator("button button, a a").count()).toBe(0);
});

test("select, menu and tabs have working keyboard behavior", async ({
  page,
}) => {
  await page.goto("/designsystem");
  const select = page.getByRole("combobox", { name: "Marknad", exact: true });
  await select.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(select).toHaveText("Norden");
  await expect(select).toBeFocused();

  const menu = page.getByRole("button", { name: "Fler åtgärder" });
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();

  const firstTab = page.getByRole("tab", { name: "Nyheter", exact: true });
  await firstTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Om bolaget", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("tabpanel", { name: "Om bolaget" }),
  ).toContainText("Verksamhet, sektor");
});

test("dialog validates, keeps focus inside, selects above backdrop and restores trigger", async ({
  page,
}) => {
  await page.goto("/designsystem");
  const trigger = page.getByRole("button", {
    name: "Ny bevakning",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Vad vill du följa?" });
  await dialog.getByRole("button", { name: "Spara exempel" }).click();
  const keyword = dialog.getByRole("textbox", { name: "Nyckelord" });
  await expect(keyword).toHaveAttribute("aria-invalid", "true");
  await expect(
    dialog.getByText("Skriv ett nyckelord att bevaka."),
  ).toBeVisible();
  await keyword.fill("halvledare");
  await dialog.getByRole("combobox", { name: "Marknad" }).click();
  await page.getByRole("option", { name: "Norden", exact: true }).click();
  await expect(dialog.getByRole("combobox")).toHaveText("Norden");
  await expect(dialog.getByRole("switch")).not.toBeChecked();
  await dialog.getByRole("switch").click();
  await expect(dialog.getByRole("switch")).toBeChecked();
  // Focus wraps inside the modal, not into the document underneath it.
  await dialog.getByRole("button", { name: "Spara exempel" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Stäng dialog" }),
  ).toBeFocused();
  await dialog.getByRole("button", { name: "Spara exempel" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByText(/halvledare.*sparat i exemplet/)).toBeVisible();
});

for (const width of [320, 390, 768]) {
  test(`gallery reflows at ${width}px without page overflow`, async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      hasTouch: true,
      isMobile: width < 768,
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/user"))
        return route.fulfill({
          json: { email: null, verified: false, plan: "free" },
        });
      return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
    });
    await page.goto("/designsystem");
    await expect(
      page.getByRole("heading", { name: "En gemensam grund." }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const filter = page.getByRole("button", { name: "För dig", exact: true });
    expect((await filter.boundingBox()).height).toBeGreaterThanOrEqual(44);
    const input = page.getByRole("textbox", { name: "Sök i exempelflödet" });
    if (width < 600)
      expect(
        await input.evaluate((element) => getComputedStyle(element).fontSize),
      ).toBe("16px");
    await page.screenshot({
      path: testInfo.outputPath(`gallery-${width}.png`),
    });
    await page
      .getByRole("button", { name: "Läs brevet" })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(`gallery-${width}-letter.png`),
    });
    await context.close();
  });
}

test("real feed pilot preserves filters, search, reaction sort, details and mobile page scroll", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/marknaden/nyheter");
  await expect(page.locator("article")).toHaveCount(3);
  await page.getByRole("button", { name: "Kursreaktion", exact: true }).click();
  await expect(page.locator("article").first()).toContainText("Volvo");
  await page.getByRole("button", { name: "Rapporter", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(1);
  await page.getByRole("button", { name: "Alla", exact: true }).click();
  await page.getByRole("textbox", { name: "Sök i nyhetsflödet" }).fill("none");
  await page
    .getByRole("search")
    .getByRole("button", { name: "Sök", exact: true })
    .click();
  await expect(page.getByText("Inga nyheter i urvalet")).toBeVisible();
  await page
    .getByRole("button", { name: "Visa alla nyheter", exact: true })
    .click();
  await expect(page.locator("article")).toHaveCount(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByRole("main")).toHaveCSS("overflow-y", "visible");
  await page.screenshot({ path: testInfo.outputPath("feed-mobile.png") });
  await page.locator("article").first().getByRole("link").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("real feed failed initial request is recoverable instead of an endless skeleton", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/feed/news?*", (route) =>
    route.fulfill({
      json: fail
        ? { error: "Nyheterna kunde inte hämtas" }
        : { items: stories },
    }),
  );
  await page.goto("/marknaden/nyheter");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Nyheterna kunde inte hämtas",
  );
  fail = false;
  await page.getByRole("button", { name: "Försök igen", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(3);
});

test("foundation passes automated accessibility checks in both themes and an open dialog", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/designsystem");
  const scan = () =>
    new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
  // Base UI registers tab/panel IDs during hydration. Check the connection,
  // rather than scanning an in-progress server-to-client handover.
  await expect.poll(() => page.locator('[role="tab"][aria-selected="true"]').evaluate(element => Boolean(document.getElementById(element.getAttribute("aria-controls"))))).toBe(true);
  expect((await scan()).violations).toEqual([]);
  await page
    .getByRole("button", { name: "Växla ljust eller mörkt tema" })
    .click();
  expect((await scan()).violations).toEqual([]);
  await page
    .getByRole("heading", { name: "Komponenter", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("components-dark.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Ny bevakning", exact: true }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .include('[role="dialog"]')
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("dialog-dark.png"),
    animations: "disabled",
  });
});
