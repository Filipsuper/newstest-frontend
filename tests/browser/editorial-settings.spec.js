import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) {
      const response = await route.fetch({
        url: `http://127.0.0.1:8100${url.pathname}${url.search}`,
      });
      return route.fulfill({ response });
    }
    return ["127.0.0.1", "localhost"].includes(url.hostname)
      ? route.continue()
      : route.abort();
  });
});

test("settings switches use the keyboard, persist theme, and save mail preferences explicitly", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  let user = {
    email: "settings@example.test",
    verified: true,
    plan: "plus",
    active_newsletters: ["Morgonbrev", "LegacyEdition"],
  };
  let writes = 0;
  await page.route("**/api/user", (route) => route.fulfill({ json: user }));
  await page.route("**/api/user/newsletters", (route) => {
    writes++;
    if (writes === 1)
      return route.fulfill({ status: 503, json: { error: "Unavailable" } });
    const body = route.request().postDataJSON();
    expect(body.newsletters).toEqual(["LegacyEdition"]);
    user = { ...user, active_newsletters: body.newsletters };
    return route.fulfill({ json: { message: "Saved" } });
  });
  await page.goto("/settings");
  const theme = page.getByRole("switch", { name: /^Mörkt läge/ });
  await expect(theme).toBeVisible();
  await theme.focus();
  await page.keyboard.press("Space");
  await expect(theme).toBeChecked();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(theme).toBeChecked();
  for (const mode of ["dark", "light"]) {
    if (mode === "light") await theme.click();
    await page.screenshot({
      path: testInfo.outputPath(`settings-${mode}.png`),
      fullPage: true,
      animations: "disabled",
    });
    expect(
      (
        await new AxeBuilder({ page })
          .include("main")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
  const morning = page.getByRole("switch", { name: /^Morgonbrevet/ });
  await morning.click();
  expect(writes).toBe(0);
  await page.getByRole("button", { name: "Spara brevval" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Dina ändringar finns kvar",
  );
  await expect(morning).not.toBeChecked();
  await page.getByRole("button", { name: "Spara brevval" }).click();
  await expect(page.getByText("Dina brevval har sparats.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Spara brevval" }),
  ).toBeDisabled();
  await page.reload();
  await expect(morning).not.toBeChecked();
  expect(writes).toBe(2);
});

test("settings has a guest login and a recoverable billing failure", async ({
  page,
}) => {
  await page.route("**/api/user", (route) =>
    route.fulfill({ json: { email: null, verified: false, plan: "free" } }),
  );
  await page.goto("/settings");
  await page
    .locator("main")
    .getByRole("button", { name: "Logga in", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "Logga in" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.route("**/api/user", (route) =>
    route.fulfill({
      json: {
        email: "billing@example.test",
        verified: true,
        plan: "premium",
        active_newsletters: [],
      },
    }),
  );
  await page.route("**/api/stripe/create-portal-session", (route) =>
    route.fulfill({ status: 503, json: { error: "Unavailable" } }),
  );
  await page.reload();
  const manage = page.getByRole("button", { name: /Hantera prenumeration/ });
  await manage.click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Prenumerationen kunde inte öppnas",
  );
  await expect(manage).toBeEnabled();
  await expect(page).toHaveURL(/\/settings$/);
});

test("missing mail preferences are disabled until they can be loaded", async ({
  page,
}) => {
  let user = { email: "missing@example.test", verified: true, plan: "free" };
  await page.route("**/api/user", (route) => route.fulfill({ json: user }));
  await page.goto("/settings");
  const morning = page.getByRole("switch", { name: /^Morgonbrevet/ });
  await expect(morning).toBeDisabled();
  await expect(page.getByText("Brevvalen kunde inte hämtas.")).toBeVisible();
  user = { ...user, active_newsletters: ["Morgonbrev"] };
  await page.getByRole("button", { name: "Hämta brevval igen" }).click();
  await expect(morning).toBeEnabled();
  await expect(morning).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Spara brevval" }),
  ).toBeDisabled();
});

for (const width of [320, 390, 1440]) {
  test(`article reading reflows at ${width}px and keeps headings, sources and sharing`, async ({
    page,
    context,
  }, testInfo) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/article/fixture-letter");
    await expect(
      page.getByRole("heading", {
        name: "Dagens viktigaste händelser",
        exact: true,
      }),
    ).toBeVisible();
    expect(await page.locator("p h2, a a, button button").count()).toBe(0);
    await expect(
      page.getByRole("link", { name: "källan", exact: true }),
    ).toHaveAttribute("href", "https://example.com/rapport");
    await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Norden Industri", exact: true }),
    ).toHaveAttribute("href", "/aktie/NORD.TEST");
    for (const mode of ["light", "dark"]) {
      await page.evaluate((mode) => {
        document.documentElement.classList.remove("dark", "light");
        document.documentElement.classList.add(mode);
      }, mode);
      // Measure final theme colors, not the temporary midpoint of a CSS transition.
      await page.evaluate(async () => {
        await Promise.all(
          document
            .getAnimations()
            .filter(
              (animation) =>
                animation.effect?.getTiming().iterations !== Infinity,
            )
            .map((animation) => animation.finished.catch(() => {})),
        );
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .include("main")
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`article-${width}-${mode}.png`),
        fullPage: true,
      });
    }
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page
      .getByRole("button", { name: "Kopiera länk", exact: true })
      .click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("https://omxsum.com/article/");
    expect(copied).not.toContain("utm_");
    // Tooltips intentionally open for keyboard-visible focus, not a script's
    // focus() immediately after a pointer click.
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Norden Industri", exact: true }),
    ).toBeFocused();
    // Base UI's visual Tooltip deliberately has no tooltip role; the link
    // keeps its own accessible name and opens the full company destination.
    await expect(
      page.getByText("Kursdata saknas", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(
      page.getByText("Kursdata saknas", { exact: true }),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("letter routes share the reading view and missing fields do not invent data", async ({
  page,
}) => {
  await page.goto("/morgonbrevet");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(
    page.getByText("Industrin tar täten – rapporter och räntor i fokus", {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/kvallsbrevet");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByText(/Senast publicerade kvällsbrevet/)).toBeVisible();
  await page.goto("/article/empty-letter");
  await expect(
    page.getByText("Brevets innehåll är inte tillgängligt just nu."),
  ).toBeVisible();
  await expect(page.getByText("Neutral", { exact: true })).toHaveCount(0);
  await expect(page.getByText("0,0 %", { exact: true })).toHaveCount(0);
});

test("landing-page letter previews reuse the archive cards without requiring quote fields", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const card = page
    .locator("article")
    .filter({ hasText: "Läs brevet →" })
    .first();
  await expect(card).toBeVisible();
  await expect(card.getByRole("link")).toHaveAttribute("href", /^\/article\//);
  await expect(card).not.toContainText("NaN");
  expect(await card.locator("a a, p p, p h2").count()).toBe(0);
  expect(errors).toEqual([]);
});
