import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const token = "fictional-confirmation-token";
async function setup(page, options = {}) {
  const state = {
    confirmed: false,
    confirmCalls: 0,
    signups: [],
    writes: [],
    login: [],
    failures: 0,
    previewError: false,
    ...options,
  };
  state.user = {
    email: "reader@example.test",
    verified: true,
    plan: "free",
    watchlist: [],
    topics: [],
    keywords: [],
    ...options.user,
  };
  await page.addInitScript(() => {
    window.EventSource = class extends EventTarget {
      close() {}
    };
  });
  await page.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname;
    const json = (body, status = 200, headers = {}) =>
      route.fulfill({ json: body, status, headers });
    if (path === "/api/mail/confirm") {
      state.confirmCalls++;
      expect(request.method()).toBe("POST");
      expect(url.search).toBe("");
      expect(request.postDataJSON().token).toBe(token);
      if (state.failures > 0) {
        state.failures--;
        return json({ error: true, code: "temporarily_unavailable" }, 503);
      }
      if (state.invalid || state.confirmed)
        return json({ error: true, code: "invalid_token" }, 400);
      state.confirmed = true;
      return json({ success: true, mail: state.user.email });
    }
    if (path === "/api/mail/status")
      return state.confirmed
        ? json({ confirmed: true, subscribed: true })
        : json({ error: true }, 401);
    if (path === "/api/user")
      return state.confirmed && !state.sessionError
        ? json(state.user)
        : json({ error: "Unauthorized" }, 401);
    if (path === "/api/mail") {
      state.signups.push(request.postDataJSON());
      if (state.deliveryError)
        return json(
          {
            error: true,
            msg: "Bekräftelsemejlet kunde inte skickas.",
            code: "delivery_failed",
          },
          503,
        );
      if (state.signups.length > 1 && state.rateLimit)
        return json(
          {
            error: true,
            msg: "Vänta en stund innan du försöker igen.",
            retryAfter: 120,
          },
          429,
          { "Retry-After": "120" },
        );
      return json({
        success: true,
        alreadyVerified: Boolean(state.existing),
        retryAfter: 60,
      });
    }
    if (path === "/api/auth/register") {
      state.login.push(request.postDataJSON());
      return json({ success: true });
    }
    if (path.startsWith("/api/user/watchlist/") && request.method() === "PUT") {
      const symbol = decodeURIComponent(path.split("/").at(-1)),
        body = request.postDataJSON();
      state.writes.push({ symbol, ...body });
      if (state.saveError)
        return json({ error: "Valet kunde inte sparas. Försök igen." }, 503);
      state.user.watchlist = body.followed
        ? [...new Set([...state.user.watchlist, symbol])]
        : state.user.watchlist.filter((item) => item !== symbol);
      return json({ watchlist: state.user.watchlist });
    }
    if (path === "/api/user/personal-feed") {
      if (state.previewError) return json({ error: true }, 503);
      return json({
        sinceHours: 48,
        stories: state.empty
          ? []
          : Array.from({ length: 4 }, (_, n) => ({
              id: `fixture-${n}`,
              symbol: "NORD.TEST",
              company: "Norden Industri",
              headline: `Fiktiv bolagsnyhet ${n + 1}`,
              publishedAt: new Date().toISOString(),
              viaWatchlist: true,
              reactionPct: n === 2 ? null : 2.4,
              primarySource: {
                name: "Fiktiv källa",
                url: "https://example.test/story",
              },
              aiSummary: {
                text: "Fiktiv AI-sammanfattning om bolagets nya order.",
                bullets: ["Fiktivt ordervärde", "Leverans nästa år"],
              },
            })),
      });
    }
    if (path.startsWith("/api/"))
      return route.fulfill({
        response: await route.fetch({
          url: `http://127.0.0.1:8100${path}${url.search}`,
        }),
      });
    if (["127.0.0.1", "localhost"].includes(url.hostname))
      return route.continue();
    return route.abort();
  });
  return state;
}
const main = (page) => page.locator("main:visible");
async function selectCompany(page) {
  await page
    .getByRole("combobox", { name: "Sök ett bolag att följa" })
    .fill("Norden");
  await page.getByRole("option", { name: /Norden Industri/ }).click();
}

for (const width of [1440, 390, 320])
  test(`confirmation ${width}: optional following, news reader and reload preserve setup`, async ({
    page,
  }, testInfo) => {
    const state = await setup(page),
      errors = [],
      external = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (
        /getmegadesk|googlesyndication|simpleanalytics|unhidden/.test(
          request.url(),
        )
      )
        external.push(request.url());
    });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/bekrafta?token=${token}`);
    await expect(page).toHaveURL(/\/bekrafta$/);
    await expect(
      page.getByRole("heading", { name: "Vilka bolag vill du följa?" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Hoppa över och läs Morgonbrevet" }),
    ).toBeVisible();
    expect(state.confirmCalls).toBe(1);
    expect(state.writes).toEqual([]);
    expect(external).toEqual([]);
    await selectCompany(page);
    await expect(
      main(page)
        .getByRole("status")
        .filter({ hasText: "Norden Industri är sparat." }),
    ).toBeVisible();
    await expect(main(page).locator("article")).toHaveCount(3);
    await expect(main(page).locator("article").first()).toContainText(
      "AI-sammanfattning",
    );
    await expect(main(page).locator("article").first()).toContainText(
      "Sedan publicering",
    );
    await expect(
      page.getByRole("link", { name: "Öppna min bevakning", exact: true }),
    ).toBeVisible();
    const continueAction = await page
      .getByRole("link", { name: "Öppna min bevakning", exact: true })
      .boundingBox();
    expect(continueAction.y + continueAction.height).toBeLessThan(900);
    expect(state.writes).toEqual([{ symbol: "NORD.TEST", followed: true }]);
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (theme) =>
          document.documentElement.classList.toggle("dark", theme === "dark"),
        theme,
      );
      await page.evaluate(async () => {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        await Promise.all(
          document
            .getAnimations()
            .filter((animation) =>
              Number.isFinite(animation.effect?.getComputedTiming().iterations),
            )
            .map((animation) => animation.finished.catch(() => {})),
        );
      });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      const audit = await new AxeBuilder({ page })
        .include("main")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(audit.violations).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`onboarding-${width}-${theme}.png`),
        fullPage: true,
      });
    }
    const headline = main(page).locator("article a").first();
    await headline.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/bekrafta$/);
    await expect(headline).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Ta bort Norden Industri" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Ta bort Norden Industri" }),
    ).toBeVisible();
    expect(state.confirmCalls).toBe(1);
    expect(errors).toEqual([]);
  });

test("confirmation separates retryable errors, consumed links and session recovery", async ({
  page,
}) => {
  const state = await setup(page, { failures: 1, sessionError: true });
  await page.goto(`/bekrafta?token=${token}`);
  await expect(
    page.getByRole("heading", { name: "Det gick inte att slutföra just nu" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Försök igen" }).click();
  await expect(main(page)).toContainText("Din prenumeration är bekräftad.");
  await expect(main(page)).toContainText("konto kunde inte öppnas");
  await expect(
    page.getByRole("combobox", { name: "Sök ett bolag att följa" }),
  ).toHaveCount(0);
  state.sessionError = false;
  await page.getByRole("button", { name: "Försök igen" }).click();
  await expect(
    page.getByRole("heading", { name: "Vilka bolag vill du följa?" }),
  ).toBeVisible();
  expect(state.confirmCalls).toBe(2);
  await page.goto(`/bekrafta?token=${token}`);
  await expect(
    page.getByRole("heading", { name: "Länken kan inte användas" }),
  ).toBeVisible();
  await expect(main(page)).not.toContainText("Din prenumeration är bekräftad.");
  expect(state.writes).toEqual([]);
});

test("failed saves and unavailable previews differ from no matches", async ({
  page,
}) => {
  const state = await setup(page, { saveError: true, previewError: true });
  await page.goto(`/bekrafta?token=${token}`);
  await expect(
    page.getByRole("heading", { name: "Vilka bolag vill du följa?" }),
  ).toBeVisible();
  await selectCompany(page);
  await expect(main(page).getByRole("alert")).toContainText(
    "Valet kunde inte sparas",
  );
  await expect(
    page.getByRole("button", { name: "Ta bort Norden Industri" }),
  ).toHaveCount(0);
  state.saveError = false;
  await selectCompany(page);
  await expect(main(page)).toContainText("Nyheterna kunde inte hämtas");
  state.previewError = false;
  state.empty = true;
  await page.getByRole("button", { name: "Försök igen" }).click();
  await expect(main(page)).toContainText("Inga nyheter matchar dina val");
  await expect(
    page.getByRole("button", { name: "Ta bort Norden Industri" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ta bort Norden Industri" }).click();
  await expect(
    page.getByRole("link", { name: "Hoppa över och läs Morgonbrevet" }),
  ).toBeVisible();
  expect(state.writes.at(-1)).toEqual({ symbol: "NORD.TEST", followed: false });
});

test("returning Pro user keeps topics, keywords and plan; free cap disables new additions only", async ({
  page,
}) => {
  const state = await setup(page, {
    confirmed: true,
    user: {
      plan: "premium",
      watchlist: ["NORD.TEST"],
      topics: ["sector:industrials"],
      keywords: ["order"],
    },
  });
  await page.goto("/bekrafta");
  await expect(main(page)).toContainText("1/100 bolag");
  await expect(main(page)).toContainText("Nyheter för dina bevakningar");
  expect(state.confirmCalls).toBe(0);
  expect(state.user.topics).toEqual(["sector:industrials"]);
  expect(state.user.keywords).toEqual(["order"]);
  state.user.plan = "free";
  state.user.watchlist = ["NORD.TEST", "B.TEST", "C.TEST", "D.TEST", "E.TEST"];
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Sök ett bolag att följa" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Ta bort Norden Industri" }).click();
  await expect(
    page.getByRole("combobox", { name: "Sök ett bolag att följa" }),
  ).toBeEnabled();
});

test("signup uses one dialog with resend cooldown, edit focus and honest delivery errors", async ({
  page,
}, testInfo) => {
  const state = await setup(page, { rateLimit: true });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.clock.install();
  await page.goto("/");
  const field = page
    .getByRole("textbox", { name: "E-postadress", exact: true })
    .first();
  await field.fill("Reader@example.test");
  await page
    .getByRole("button", { name: "Prenumerera", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Kolla din inkorg");
  await expect(
    dialog.getByRole("button", { name: /Skicka igen om/ }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Nästa", exact: true }),
  ).toHaveCount(0);
  await expect(dialog).not.toHaveAttribute("data-starting-style");
  await expect(dialog).toHaveCSS("opacity", "1");
  expect(
    (
      await new AxeBuilder({ page })
        .include('[role="dialog"]')
        .withTags(["wcag2a", "wcag2aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("signup-dialog-mobile.png"),
  });
  await page.clock.fastForward(61000);
  await dialog.getByRole("button", { name: "Skicka länken igen" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Vänta en stund");
  await expect(
    dialog.getByRole("button", { name: /Skicka igen om/ }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Ändra e-postadress" }).click();
  await expect(field).toBeFocused();
  await expect(field).toHaveValue("reader@example.test");
  state.deliveryError = true;
  await field.fill("corrected@example.test");
  await page
    .getByRole("button", { name: "Prenumerera", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("Bekräftelsemejlet kunde inte skickas.", { exact: true }),
  ).toBeVisible();
  await expect(field).toHaveValue("corrected@example.test");
});

test("existing subscription offers login without claiming a new email was sent", async ({
  page,
}) => {
  const state = await setup(page, { existing: true });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "E-postadress", exact: true })
    .first()
    .fill("reader@example.test");
  await page
    .getByRole("button", { name: "Prenumerera", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText("Du prenumererar redan");
  await page.getByRole("button", { name: "Logga in och fortsätt" }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "E-postadress" })
    .fill("reader@example.test");
  await page.getByRole("button", { name: "Skicka inloggningslänk" }).click();
  expect(state.login).toEqual([
    { email: "reader@example.test", redirectTo: "/bekrafta" },
  ]);
  expect(state.writes).toEqual([]);
});
