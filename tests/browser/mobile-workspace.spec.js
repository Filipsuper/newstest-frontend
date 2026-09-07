import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.EventSource = class extends EventTarget {
      close() {}
    };
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/")) {
      return route.fulfill({
        response: await route.fetch({
          url: `http://127.0.0.1:8100${url.pathname}${url.search}`,
        }),
      });
    }
    if (["127.0.0.1", "localhost"].includes(url.hostname))
      return route.continue();
    return route.abort();
  });
});

// Page scrollWidth alone misses choices clipped inside an overflow:auto group.
async function expectChoicesToFit(group) {
  await expect(group).toBeVisible();
  const sizes = await group.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      clipped: element.scrollWidth > element.clientWidth + 1,
      outside: bounds.left < 0 || bounds.right > innerWidth + 1,
      buttons: [...element.querySelectorAll("button, a")].map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          label: button.textContent,
          height: rect.height,
          fits: rect.left >= bounds.left && rect.right <= bounds.right + 1,
          textFits: button.scrollWidth <= button.clientWidth + 1,
        };
      }),
    };
  });
  expect.soft(sizes.clipped, JSON.stringify(sizes)).toBe(false);
  expect.soft(sizes.outside, JSON.stringify(sizes)).toBe(false);
  for (const button of sizes.buttons) {
    expect.soft(button.fits && button.textFits, button.label).toBe(true);
    expect.soft(button.height, button.label).toBeGreaterThanOrEqual(44);
  }
}

for (const width of [320, 390, 600, 768, 820]) {
  test.describe(`mobile ${width}`, () => {
    test.use({ hasTouch: width !== 320 });
    test(`workspace choices fit and remain usable at ${width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 850 });
      for (const [path, label, lastChoice] of [
        ["/marknaden/nyheter", "Nyhetskategori", "Insyn"],
        ["/aktier", "Utforska bolag", "Alla bolag"],
        ["/nyhetsbrev", "Välj brev", "Kvällsbrevet"],
        ["/bevakning", "Filtrera bevakning", "Nyckelord"],
        ["/aktie/NORD.TEST", "Kursperiod", "5 år"],
      ]) {
        await page.goto(path);
        // Exercise the extra catch-up choice through a real return visit, not
        // browser storage manipulation.
        if (path === "/bevakning") {
          await expect(page.getByRole("group", { name: label })).toBeVisible();
          await page.reload();
          await expect(
            page.getByRole("button", { name: "Sedan sist", exact: true }),
          ).toBeVisible();
        }
        const group = page.getByRole("group", { name: label, exact: true });
        await expectChoicesToFit(group);
        if (path === "/marknaden/nyheter") {
          await expectChoicesToFit(
            page.getByRole("group", { name: "Sortera nyheter" }),
          );
        }
        for (const navigation of await page.locator("main nav").all()) {
          if (await navigation.isVisible())
            await expectChoicesToFit(navigation);
        }
        expect
          .soft(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          )
          .toBe(true);
        await group.scrollIntoViewIfNeeded();
        for (const theme of ["light", "dark"]) {
          await page.evaluate(async (mode) => {
            document.documentElement.classList.toggle("dark", mode === "dark");
            await new Promise((resolve) => requestAnimationFrame(resolve));
            await Promise.all(
              document
                .getAnimations()
                .filter((animation) =>
                  Number.isFinite(
                    animation.effect?.getComputedTiming().iterations,
                  ),
                )
                .map((animation) => animation.finished.catch(() => {})),
            );
          }, theme);
          await page.screenshot({
            path: testInfo.outputPath(`${label}-${width}-${theme}.png`),
          });
        }
        // Selecting the rightmost choice must not require a hidden sideways swipe.
        const choice = group.getByRole("button", {
          name: lastChoice,
          exact: true,
        });
        if (await choice.isEnabled()) {
          await choice.click();
          await expect(choice).toHaveAttribute("aria-pressed", "true");
        }
        await group.getByRole("button").first().focus();
        await page.keyboard.press("ArrowRight");
        await expect(group.getByRole("button").nth(1)).toBeFocused();
        await expectChoicesToFit(group);
      }
    });
  });
}

test("featured news stays compact while its reader retains AI prose and bullets", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto("/marknaden");
  const featured = page.getByRole("region", {
    name: "Viktigast just nu",
    exact: true,
  });
  const story = featured.locator('a[href="/nyhet/fixture-0"]');
  await expect(story).toBeVisible();
  await expect(
    featured.getByText("AI-sammanfattning", { exact: true }),
  ).toHaveCount(0);
  await expect(featured.getByRole("list")).toHaveCount(0);
  await expect(featured).not.toContainText("Fiktiv AI-text");
  await expect(featured).not.toContainText(
    "Uppgifterna kommer från bolagets publicerade rapport.",
  );
  await expect(featured).toContainText("Sedan publicering");
  await expect(featured).toContainText("MFN");
  await featured.screenshot({
    path: testInfo.outputPath("compact-featured-mobile.png"),
  });
  await story.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Fiktiv AI-text");
  await expect(
    dialog
      .locator("[data-reading]")
      .getByRole("list", { name: "AI-sammanfattningens huvudpunkter" })
      .getByRole("listitem"),
  ).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/marknaden$/);
  await expect(story).toBeFocused();
});
