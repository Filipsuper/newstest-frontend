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
    previewRequests: [],
    letters: [],
    letterWrites: [],
    alertWrites: [],
    trialWrites: [],
    topicWrites: [],
    topicRequests: 0,
    letterRevision: 0,
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
      state.letters = ["morning"];
      return json({ success: true, mail: state.user.email });
    }
    if (path === "/api/mail/status")
      return state.confirmed
        ? json({ confirmed: true, subscribed: true })
        : json({ error: true }, 401);
    if (path === "/api/user") {
      if (state.accountFailure) return json({ error: true }, state.accountFailure);
      return state.confirmed && !state.sessionError
        ? json(state.user)
        : json({ error: "Unauthorized" }, 401);
    }
    if (path === "/api/feed/topics") {
      state.topicRequests++;
      if (state.topicLoadError) return json({ error: true }, 503);
      return json(state.vocabulary || { events: ["EARNINGS", "GUIDANCE", "ORDER", "M_AND_A", "CAPITAL_RAISE", "DIVIDEND", "INSIDER"],
        sectors: ["Technology", "Industrials", "Energy"], segments: ["LARGE_CAP", "MID_CAP"] });
    }
    if (path === "/api/user/topics") {
      state.topicWrites.push(request.postDataJSON());
      if (state.topicSaveError) return json({ error: true }, 503);
      state.user.topics = request.postDataJSON().topics;
      return json({ topics: state.user.topics });
    }
    if (path === "/api/user/trial") {
      state.trialWrites.push(request.postDataJSON());
      if (state.trialError) return json({ error: true }, state.trialError);
      const tier = request.postDataJSON().tier;
      state.user.plan = tier === "pro" ? "premium" : "plus";
      state.user.trial = { status: "active", eligible: false, plan: tier, startedAt: Date.now(), endsAt: Date.now() + 604800000, autoRenews: false };
      return json(state.user.trial);
    }
    if (path === "/api/user/newsletters") {
      if (state.letterError) return json({ error: true }, state.letterError);
      if (request.method() === "PUT") {
        state.letterWrites.push(request.postDataJSON());
        state.letters = request.postDataJSON().selected;
        state.letterRevision++;
      }
      return json({ revision: state.letterRevision, selected: state.letters,
        catalog: [{ id: "morning", title: "Morgonbrevet", description: "Börsnyheter och sammanhang varje vardag på morgonen." }] });
    }
    if (path === "/api/user/company-alerts") {
      if (request.method() === "PUT") {
        if (state.alertSaveError) return json({ error: true }, state.alertSaveError);
        state.alertWrites.push(request.postDataJSON());
        state.alerts = { ...state.alerts, ...request.postDataJSON(), revision: request.postDataJSON().revision + 1 };
      }
      return json({ revision: 0, enabled: false, importanceLevel: "important", mutedSymbols: [],
        quietHours: { enabled: true, start: "22:00", end: "07:00" }, timeZone: "Europe/Stockholm",
        destination: state.user.email, verified: true,
        entitlement: { eligible: state.user.plan !== "free", companyLimit: state.user.plan === "free" ? 2 : 20 },
        delivery: { available: false, status: "service_paused" }, ...state.alerts });
    }
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
      state.previewRequests.push(Object.fromEntries(url.searchParams));
      if (state.previewError) return json({ error: true }, 503);
      return json({
        sinceHours: 168,
        coverage: { complete: !state.partial },
        importantCoverage: { complete: !state.partial },
        importantStories: state.empty ? [] : [{ id: "fixture-important", company: "Norden Industri", symbol: "NORD.TEST",
          headline: "Fiktivt viktigt besked", publishedAt: new Date().toISOString(), viaWatchlist: true,
          reactionPct: 2.4, primarySource: { name: "Fiktiv källa", url: "https://example.test/story" },
          aiSummary: { text: "Fiktiv AI-sammanfattning om en betydande order.", bullets: ["Fiktivt ordervärde"] } }],
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
    if (path === "/api/feed/companies" && state.companies !== undefined) return json(state.companies);
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
async function finishSetup(page) {
  const next = page.getByRole("button", { name: /^(Fortsätt till mejl|Fortsätt)$/ });
  await next.click();
  if (await page.getByRole("heading", { name: "Håll koll på vad som händer i dina bolag" }).count())
    await page.getByRole("button", { name: /^(Fortsätt gratis|Fortsätt|Fortsätt utan bolagsmejl)$/ }).click();
  await expect(page.getByRole("heading", { name: "Din bevakning är klar" })).toBeVisible();
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
    // A cold dev route may compile before confirmation can finish.
    await expect(page).toHaveURL(/\/bekrafta$/, { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "Vilka bolag vill du hålla koll på?" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Välj bolag senare" }),
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
    await expect(main(page)).toContainText("Det här får du i Mina bolag");
    await expect(main(page)).toContainText("Fiktivt viktigt besked");
    expect(state.previewRequests).toContainEqual({ limit: "1", filter: "companies" });
    await page.screenshot({ path: testInfo.outputPath(`company-step-${width}.png`), fullPage: true });
    await finishSetup(page);
    await expect(main(page).locator("article")).toHaveCount(1);
    await expect(main(page)).toContainText("Senaste 7 dagarna");
    await expect(main(page).locator("article").first()).toContainText(
      "AI-sammanfattning",
    );
    await expect(main(page).locator("article").first()).toContainText(
      "Sedan publicering",
    );
    await expect(
      page.getByRole("link", { name: "Se nyheterna för mina bolag", exact: true }),
    ).toBeVisible();
    const continueAction = await page
      .getByRole("link", { name: "Se nyheterna för mina bolag", exact: true })
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
    // The first intercepted reader route is compiled lazily by the dev server.
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15000 });
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/bekrafta$/);
    await expect(headline).toBeFocused();
    await expect(page.getByRole("heading", { name: "Din bevakning är klar" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Din bevakning är klar" })).toBeVisible();
    await expect(main(page).locator('dl[aria-label="Dina sparade val"]')).toContainText("Norden Industri");
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
    page.getByRole("heading", { name: "Vilka bolag vill du hålla koll på?" }),
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
    page.getByRole("heading", { name: "Vilka bolag vill du hålla koll på?" }),
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
  await finishSetup(page);
  await expect(main(page)).toContainText("Nyheterna kunde inte hämtas");
  state.previewError = false;
  state.empty = true;
  await page.getByRole("button", { name: "Försök igen" }).click();
  await expect(main(page)).toContainText("Inga nyheter matchar dina val");
  await page.reload();
  await page.getByRole("button", { name: "Ändra mina val" }).click();
  await page.getByRole("button", { name: /^(Fortsätt|Fortsätt utan Morgonbrevet)$/ }).click();
  await expect(
    page.getByRole("button", { name: "Ta bort Norden Industri" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ta bort Norden Industri" }).click();
  await expect(
    page.getByRole("button", { name: "Välj bolag senare" }),
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
  expect(state.confirmCalls).toBe(0);
  expect(state.user.topics).toEqual(["sector:industrials"]);
  expect(state.user.keywords).toEqual(["order"]);
  state.user.plan = "free";
  state.user.watchlist = ["NORD.TEST", "B.TEST"];
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

for (const width of [1440, 390, 320]) test(`account journey ${width}: explicit letter choice, follow intent and optional paid emails`, async ({ page }, testInfo) => {
  const state = await setup(page, { user: { plan: "plus" } });
  await page.setViewportSize({ width, height: 1000 });
  await page.goto("/kom-igang?company=NORD.TEST&returnTo=%2Faktie%2Fnorden");
  await expect(page.getByRole("heading", { name: "Få koll på nyheterna om dina bolag" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`account-step-${width}.png`), fullPage: true });
  await page.getByRole("textbox", { name: "E-postadress", exact: true }).fill("Reader@example.test");
  await page.getByRole("button", { name: "Fortsätt med e-post" }).click();
  await expect(main(page).getByRole("status")).toContainText("reader@example.test");
  await expect(page.getByRole("heading", { name: "Kolla din inkorg" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "E-postadress", exact: true })).toHaveCount(0);
  expect(state.login[0].redirectTo).toContain("company=NORD.TEST");
  expect(state.letterWrites).toEqual([]);
  expect(state.alertWrites).toEqual([]);
  state.confirmed = true; // Fictional magic-link session, never an actual email.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Vill du få börsmorgonen sammanfattad?" })).toBeVisible();
  await expect(page.getByRole("switch", { name: /^Morgonbrevet(?: på mejl – gratis)?$/ })).not.toBeChecked();
  await page.screenshot({ path: testInfo.outputPath(`letter-step-${width}.png`), fullPage: true });
  await page.getByRole("switch", { name: /^Morgonbrevet(?: på mejl – gratis)?$/ }).click();
  expect(state.letterWrites).toEqual([]);
  await expect(page.getByRole("button", { name: "Hoppa över", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Spara och fortsätt" }).click();
  expect(state.letterWrites).toEqual([{ selected: ["morning"], revision: 0 }]);
  await expect(page.getByText("Du ville följa", { exact: true })).toBeVisible();
  expect(state.writes).toEqual([]);
  await page.getByRole("button", { name: "Följ Norden Industri", exact: true }).click();
  await expect(page.getByRole("button", { name: "Ta bort Norden Industri" })).toBeVisible();
  await page.getByRole("button", { name: "Fortsätt till mejl" }).click();
  await expect(page.getByRole("switch", { name: "Mejl om mina bolag" })).not.toBeChecked();
  await expect(page.getByText("Se nyheter som matchar", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Alla mina följda bolag|Bolagsval ·/)).toHaveCount(0);
  await expect(main(page).locator("details")).toHaveCount(0);
  await expect(main(page)).toContainText("Inga mejl skickas ännu");
  await expect(page.getByText(/Tysta timmar ·/)).toHaveCount(0);
  await page.getByRole("switch", { name: "Mejl om mina bolag" }).click();
  expect(state.alertWrites).toEqual([]);
  await expect(page.getByRole("button", { name: "Spara och fortsätt", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Spara mejlval", exact: true })).toHaveCount(0);
  await expect(page.getByText("Du har osparade mejlval.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tillbaka", exact: true })).toBeDisabled();
  for (const theme of ["light", "dark"]) {
    await page.evaluate(async value => {
      document.documentElement.classList.toggle("dark", value === "dark");
      await new Promise(resolve => requestAnimationFrame(resolve));
      await Promise.all(document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getComputedTiming().iterations))
        .map(animation => animation.finished.catch(() => {})));
    }, theme);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`email-step-${width}-${theme}.png`), fullPage: true });
  }
  await page.getByRole("button", { name: "Spara och fortsätt", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Din bevakning är klar" })).toBeVisible();
  await expect(main(page)).toContainText("Mejlval sparade · inga mejl skickas ännu");
  expect(state.alertWrites).toHaveLength(1);
  expect(state.alertWrites[0].enabled).toBe(true);
  expect(state.alertWrites[0].quietHours).toEqual({ enabled: true, start: "22:00", end: "07:00" });
  await expect(page.getByRole("link", { name: "Tillbaka där du började" })).toHaveAttribute("href", "/aktie/norden");
  await expect(main(page)).toContainText("Fiktivt viktigt besked");
});

for (const width of [1440, 390, 320]) test(`no-card trial ${width}: optional, readable and independent of email consent`, async ({ page }, testInfo) => {
  const state = await setup(page, { confirmed: true, user: { watchlist: ["NORD.TEST"], trial: { eligible: true, status: "unused" } } });
  await page.setViewportSize({ width, height: 1000 });
  await page.goto("/kom-igang");
  await page.getByRole("button", { name: /^(Fortsätt|Fortsätt utan Morgonbrevet)$/ }).click();
  const offer = page.getByRole("region", { name: "Prova en plan" });
  await expect(offer).toHaveCount(0);
  await page.getByRole("button", { name: "Fortsätt till mejl" }).click();
  await expect(page.getByRole("heading", { name: "Håll koll på vad som händer i dina bolag" })).toBeVisible();
  await expect(offer).toContainText("Ingen automatisk betalning");
  await expect(offer.getByRole("button", { name: "Prova Plus gratis" })).toBeVisible();
  const freeAction = page.getByRole("button", { name: "Fortsätt gratis", exact: true });
  expect((await freeAction.boundingBox()).y).toBeLessThan((await offer.boundingBox()).y);
  expect((await freeAction.boundingBox()).y + (await freeAction.boundingBox()).height).toBeLessThan(844);
  for (const theme of ["light", "dark"]) {
    await page.evaluate(async value => {
      document.documentElement.classList.toggle("dark", value === "dark");
      await new Promise(resolve => requestAnimationFrame(resolve));
      await Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect?.getComputedTiming().iterations)).map(a => a.finished.catch(() => {})));
    }, theme);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`trial-${width}-${theme}.png`), fullPage: true });
  }
  await offer.getByRole("button", { name: "Prova Plus gratis" }).click();
  await expect(main(page).getByRole("status").filter({ hasText: "Plus · Provperiod" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Håll koll på vad som händer i dina bolag" })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Mejl om mina bolag" })).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Fortsätt utan bolagsmejl", exact: true })).toBeEnabled();
  const action = await page.getByRole("button", { name: "Fortsätt utan bolagsmejl", exact: true }).boundingBox();
  const trialStatus = await main(page).getByRole("status").filter({ hasText: "Plus · Provperiod" }).boundingBox();
  expect(trialStatus.y).toBeGreaterThan(action.y + action.height);
  await expect(main(page).getByRole("status").filter({ hasText: "Plus · Provperiod" })).not.toContainText("automatisk betalning");
  expect(state.trialWrites).toEqual([{ tier: "plus" }]);
  expect(state.letterWrites).toEqual([]); expect(state.alertWrites).toEqual([]); expect(state.writes).toEqual([]);
  await page.getByRole("button", { name: "Fortsätt utan bolagsmejl", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Din bevakning är klar" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Din provperiod" })).toContainText("Din Plus-provperiod är igång");
  await expect(page.getByRole("region", { name: "Din provperiod" })).toContainText("7 dagar kvar");
  await expect(page.getByRole("region", { name: "Din provperiod" })).not.toContainText("Provperiod till");
  await expect(page.getByRole("region", { name: "Din provperiod" })).not.toContainText("automatisk betalning");
  await expect(page.getByRole("region", { name: "Din provperiod" }).getByRole("link", { name: "Se min plan" })).toHaveAttribute("href", "/settings#plan");
  await expect(page.getByRole("link", { name: "Utforska Norden Industri", exact: true })).toHaveAttribute("href", "/aktie/NORD.TEST");
  await expect(page.getByRole("link", { name: "Hitta fler bolag", exact: true })).toHaveAttribute("href", "/aktier/screener");
  await expect(page.getByRole("link", { name: "Öppna Terminal", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Plus-provperiod/ })).toHaveCount(0); // The setup header stays quiet.
  for (const theme of ["light", "dark"]) {
    await page.evaluate(async value => {
      document.documentElement.classList.toggle("dark", value === "dark");
      await new Promise(resolve => requestAnimationFrame(resolve));
      await Promise.all(document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getComputedTiming().iterations))
        .map(animation => animation.finished.catch(() => {})));
    }, theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`completion-trial-${width}-${theme}.png`), fullPage: true });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: testInfo.outputPath(`completion-top-${width}-${theme}.png`) });
  }
  await page.reload();
  await expect(page.getByRole("region", { name: "Din provperiod" })).toContainText("Din Plus-provperiod är igång");
  expect(state.trialWrites).toHaveLength(1);
  await page.goto("/settings");
  const planSection = main(page).locator("#plan");
  await expect(planSection.locator("[data-trial-label]")).toHaveCount(1);
  await expect(planSection.locator("[data-trial-label]")).toHaveText("Plus · Provperiod · 7 d kvar");
  await expect(planSection).not.toContainText("Provperiod till");
  await expect(planSection).not.toContainText("gratisversionen");
  const labelDetails = planSection.getByRole("button", { name: /^Plus-provperiod.*Visa villkor$/ });
  await labelDetails.focus();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toContainText("När provperioden är slut fortsätter du med gratisversionen. Ingen automatisk betalning.");
  await expect(tooltip).toContainText(`Provperiod till ${new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" }).format(state.user.trial.endsAt)}.`);
  expect((await new AxeBuilder({ page }).include("main").include('[role="tooltip"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);
  await labelDetails.click(); // Details work by tap/click too, not only hover.
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);
  expect(state.trialWrites).toHaveLength(1);
  expect(state.alertWrites).toEqual([]); expect(state.letterWrites).toEqual([]);
  const labelGeometry = label => label.evaluate(element => {
    const style = getComputedStyle(element);
    return Object.fromEntries(["fontSize", "lineHeight", "borderRadius", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]
      .map(key => [key, style[key]]));
  });
  const standardLabel = page.locator('header a[aria-label$="startsida"] > span').last();
  expect(await labelGeometry(page.locator("header [data-trial-label]"))).toEqual(await labelGeometry(standardLabel));
  expect(await labelGeometry(planSection.locator("[data-trial-label]"))).toEqual(await labelGeometry(standardLabel));
  expect((await labelDetails.boundingBox()).height).toBeGreaterThanOrEqual(44);
  expect((await page.getByRole("link", { name: /^Plus-provperiod/ }).boundingBox()).height).toBeGreaterThanOrEqual(44);
  await expect(page.getByRole("link", { name: /^Plus-provperiod/ })).toHaveAttribute("href", "/settings#plan");
  await page.getByRole("link", { name: /^Plus-provperiod/ }).click();
  await expect(page).toHaveURL(/\/settings#plan$/);
  await expect(main(page).locator("#plan")).toBeInViewport();
  await expect.poll(async () => {
    const header = await page.locator("header").first().boundingBox(), plan = await page.locator("#plan").boundingBox();
    return plan.y >= header.y + header.height;
  }).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include("header").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath(`trial-header-${width}.png`), fullPage: true });
  await expect(main(page).getByRole("button", { name: /Hantera prenumeration/ })).toHaveCount(0);
  await page.goto("/pro");
  await expect(main(page).locator("[data-trial-label]")).toHaveText("Plus · Provperiod · 7 d kvar");
  await expect(main(page).getByRole("button", { name: "Välj Plus", exact: true })).toBeEnabled();
  await expect(main(page).getByRole("button", { name: "Välj Pro", exact: true })).toBeEnabled();
  await page.goto("/pro/klart");
  await expect(main(page).getByRole("heading", { name: "Din plan är redo" })).toHaveCount(0);
});

for (const width of [320, 1440]) test(`trial badge ${width}: sticky company contents stay below the expanded header`, async ({ page }) => {
  await setup(page, { confirmed: true, user: { plan: "plus", watchlist: ["NORD.TEST"],
    trial: { status: "active", plan: "plus", endsAt: Date.now() + 604800000 } } });
  await page.setViewportSize({ width, height: 1000 });
  await page.goto("/aktie/NORD.TEST#profile");
  await expect(page.getByRole("link", { name: /^Plus-provperiod/ })).toBeVisible();
  await expect(page.locator("#profile")).toBeVisible();
  await expect.poll(async () => {
    const header = await page.locator("header").first().boundingBox(), section = await page.locator("#profile").boundingBox();
    return section.y >= header.y + header.height;
  }).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const contents = width === 320 ? page.getByRole("button", { name: "Avsnitt", exact: true })
    : page.getByRole("navigation", { name: "Bolagsavsnitt", exact: true });
  await expect(contents).toBeVisible();
  const header = await page.locator("header").first().boundingBox(), contentsBox = await contents.boundingBox();
  expect(contentsBox.y).toBeGreaterThanOrEqual(header.y + header.height);
  if (width === 320) expect((await page.locator("#profile-heading").boundingBox()).y).toBeGreaterThanOrEqual(contentsBox.y + contentsBox.height);
  if (width === 320) {
    await contents.click();
    await page.getByRole("dialog").getByRole("link", { name: "Nyheter & reaktioner", exact: true }).click();
  } else await contents.getByRole("link", { name: "Nyheter & reaktioner", exact: true }).click();
  await expect(page.locator("#news-heading")).toBeFocused();
  await expect.poll(async () => {
    const header = await page.locator("header").first().boundingBox(), heading = await page.locator("#news-heading").boundingBox();
    return heading.y >= header.y + header.height;
  }).toBe(true);
  if (width === 320) {
    await page.goto("/marknaden/bevakning/hantera");
    const tabs = page.getByRole("tablist", { name: "Anpassa bevakning", exact: true });
    await expect(tabs).toBeVisible();
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: "instant" }));
    await expect.poll(async () => {
      const header = await page.locator("header").first().boundingBox(), tabBox = await tabs.boundingBox();
      return tabBox.y >= header.y + header.height;
    }).toBe(true);
    await tabs.getByRole("tab", { name: /^Nyckelord/ }).click();
    await expect(main(page).getByRole("textbox", { name: /nyckelord/i }).first()).toBeVisible();
  }
});

test("declining the offer completes onboarding without a trial or consent write", async ({ page }) => {
  const state = await setup(page, { confirmed: true, user: { watchlist: ["NORD.TEST"], trial: { eligible: true, status: "unused" } } });
  await page.goto("/kom-igang");
  await page.getByRole("button", { name: /^(Fortsätt|Fortsätt utan Morgonbrevet)$/ }).click();
  await page.getByRole("button", { name: "Fortsätt till mejl" }).click();
  await page.getByRole("button", { name: "Fortsätt gratis", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Din bevakning är klar" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Din provperiod" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Utforska Norden Industri", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Utforska börsens bolag", exact: true })).toHaveAttribute("href", "/aktier");
  await expect(page.getByRole("link", { name: "Hitta fler bolag", exact: true })).toHaveCount(0);
  expect(state.trialWrites).toEqual([]); expect(state.user.plan).toBe("free");
  expect(state.letterWrites).toEqual([]); expect(state.alertWrites).toEqual([]);
});

test("declining or failing a trial never blocks free onboarding", async ({ page }) => {
  const state = await setup(page, { confirmed: true, trialError: 503, user: { watchlist: ["NORD.TEST"], trial: { eligible: true, status: "unused" } } });
  await page.goto("/kom-igang");
  await page.getByRole("button", { name: /^(Fortsätt|Fortsätt utan Morgonbrevet)$/ }).click();
  await page.getByRole("button", { name: "Fortsätt till mejl" }).click();
  await page.getByRole("button", { name: "Prova Pro gratis" }).click();
  await expect(main(page).getByRole("alert")).toContainText("Provperioden kunde inte startas");
  await page.getByRole("button", { name: "Fortsätt gratis", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Din bevakning är klar" })).toBeVisible();
  expect(state.user.plan).toBe("free"); expect(state.letterWrites).toEqual([]); expect(state.alertWrites).toEqual([]);
});

test("email save-and-continue preserves a failed draft and only advances after a successful save", async ({ page }) => {
  const state = await setup(page, { confirmed: true, user: { plan: "plus", watchlist: ["NORD.TEST"] } });
  await page.goto("/kom-igang");
  await page.getByRole("button", { name: /^(Fortsätt|Fortsätt utan Morgonbrevet)$/ }).click();
  await expect(main(page)).toContainText("Det här får du i Mina bolag");
  await page.getByRole("button", { name: "Fortsätt till mejl" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Håll koll på vad som händer i dina bolag" })).toBeVisible();
  await page.getByRole("switch", { name: "Mejl om mina bolag" }).click();
  state.alertSaveError = 503;
  await page.getByRole("button", { name: "Spara och fortsätt", exact: true }).click();
  await expect(main(page).getByRole("alert")).toContainText("Mejlbevakningen kunde inte nås");
  await expect(page.getByRole("switch", { name: "Mejl om mina bolag" })).toBeChecked();
  await expect(page.getByRole("heading", { name: "Din bevakning är klar" })).toHaveCount(0);
  expect(state.alertWrites).toEqual([]);
  state.alertSaveError = 0;
  await page.getByRole("button", { name: "Spara och fortsätt", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Din bevakning är klar" })).toBeVisible();
  expect(state.alertWrites).toHaveLength(1);
  expect(state.alertWrites[0].enabled).toBe(true);
  expect(state.letterWrites).toEqual([]);
});

test("skip choices never subscribes or follows; unavailable letters can be skipped", async ({ page }) => {
  const state = await setup(page, { confirmed: true, letterError: 503 });
  await page.goto("/kom-igang");
  await expect(main(page).getByRole("alert")).toContainText("Brevvalen kunde inte");
  await page.getByRole("button", { name: "Välj brev senare", exact: true }).click();
  await page.getByRole("button", { name: "Välj bolag senare" }).click();
  await expect(page.getByRole("heading", { name: "Du är igång" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Till Marknaden", exact: true })).toHaveAttribute("href", "/marknaden");
  await expect(page.getByRole("link", { name: "Se nyheterna för mina bolag", exact: true })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Dina bolag att utforska" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Din provperiod" })).toHaveCount(0);
  expect(await main(page).locator("p").allTextContents()).not.toContain("0");
  expect(state.writes).toEqual([]);
  expect(state.letterWrites).toEqual([]);
  expect(state.alertWrites).toEqual([]);
});

test("Pro completion bounds long lists, handles missing directory names and keeps paid tools separate from trial status", async ({ page }, testInfo) => {
  const state = await setup(page, { confirmed: true, empty: true, user: { plan: "premium",
    watchlist: ["SAAB-B", "EGET", "UNKNOWN.TEST", "NORD.TEST", "SKAR.TEST"],
    trial: { status: "active", plan: "pro", endsAt: Date.now() + 2 * 86400000 } },
    companies: [{ symbol: "SAAB-B", nativeSymbol: "SAAB B", name: "Saab B" },
      { symbol: "EGET", nativeSymbol: "EGET", name: "Egetis Therapeutics med ett väldigt långt testnamn" }] });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.addInitScript(() => sessionStorage.setItem("omxsum:onboarding-step:account:reader@example.test", "4"));
  await page.goto("/kom-igang");
  const companies = page.getByRole("list", { name: "Dina bolag att utforska" });
  await expect(companies.getByRole("listitem")).toHaveCount(3);
  await expect(page.getByRole("link", { name: "Utforska Saab B", exact: true })).toHaveAttribute("href", "/aktie/SAAB-B");
  await expect(page.getByRole("link", { name: "Utforska UNKNOWN.TEST", exact: true })).toHaveAttribute("href", "/aktie/UNKNOWN.TEST");
  await expect(page.getByRole("link", { name: "Visa alla 5 bolag", exact: true })).toHaveAttribute("href", "/marknaden/bevakning/hantera");
  await expect(page.getByRole("region", { name: "Din provperiod" })).toContainText("Din Pro-provperiod är igång");
  await expect(page.getByRole("link", { name: "Öppna Terminal", exact: true })).toHaveAttribute("href", "/terminal");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("completion-pro-long-mobile.png"), fullPage: true });
  state.user.trial = { ...state.user.trial, status: "converted" };
  await page.reload();
  await expect(page.getByRole("region", { name: "Din provperiod" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Öppna Terminal", exact: true })).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByRole("link", { name: /^Pro-provperiod/ })).toHaveCount(0);
  await expect(main(page).locator("#plan [data-trial-label]")).toHaveCount(0);
  await expect(main(page).locator("#plan")).toContainText("Pro");
  expect(state.trialWrites).toEqual([]); expect(state.writes).toEqual([]);
  expect(state.alertWrites).toEqual([]); expect(state.letterWrites).toEqual([]);
});

test("expired trial completion does not claim access or offer paid-tool shortcuts", async ({ page }) => {
  await setup(page, { confirmed: true, user: { watchlist: ["NORD.TEST"],
    trial: { status: "expired", plan: "pro", endsAt: Date.now() - 1000 } } });
  await page.addInitScript(() => sessionStorage.setItem("omxsum:onboarding-step:account:reader@example.test", "4"));
  await page.goto("/kom-igang");
  await expect(page.getByRole("heading", { name: "Din bevakning är klar" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Din provperiod" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Öppna Terminal", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Hitta fler bolag", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Utforska Norden Industri", exact: true })).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByRole("link", { name: /^Pro-provperiod/ })).toHaveCount(0);
  await expect(main(page).locator("#plan [data-trial-label]")).toHaveCount(0);
  await expect(main(page).locator("#plan")).toContainText("Gratis");
});

test("minimal email step preserves existing company exceptions and quiet hours", async ({ page }) => {
  const state = await setup(page, {
    confirmed: true,
    user: { plan: "plus", watchlist: ["NORD.TEST", "BANK.TEST"] },
    alerts: { enabled: true, mutedSymbols: ["BANK.TEST"], quietHours: { enabled: true, start: "21:00", end: "08:00" } },
  });
  await page.goto("/kom-igang");
  await page.getByRole("button", { name: /^(Fortsätt|Fortsätt utan Morgonbrevet)$/ }).click();
  await page.getByRole("button", { name: "Fortsätt till mejl" }).click();
  await expect(page.getByRole("switch", { name: "Mejl om mina bolag" })).toBeChecked();
  await expect(page.getByText("1 av 2 bolag", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ändra bolagsval" })).toBeVisible();
  await expect(main(page).locator("details")).toHaveCount(0);
  await page.getByRole("button", { name: "Fler relevanta", exact: true }).click();
  expect(state.alertWrites).toEqual([]);
  await expect(page.getByRole("link", { name: "Ändra bolagsval" })).toBeDisabled();
  await page.getByRole("button", { name: "Spara och fortsätt", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Din bevakning är klar" })).toBeVisible();
  expect(state.alertWrites).toHaveLength(1);
  expect(state.alertWrites[0]).toMatchObject({ enabled: true, importanceLevel: "relevant", mutedSymbols: ["BANK.TEST"], quietHours: { enabled: true, start: "21:00", end: "08:00" } });
  expect(state.writes).toEqual([]);
});

for (const width of [320, 390, 1440]) test(`email level help stays below the slider at ${width}px without saving a preview`, async ({ page }, testInfo) => {
  const state = await setup(page, { confirmed: true, user: { plan: "plus", watchlist: ["NORD.TEST"] } });
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/kom-igang");
  await page.getByRole("button", { name: /^(Fortsätt|Fortsätt utan Morgonbrevet)$/ }).click();
  await page.getByRole("button", { name: "Fortsätt till mejl" }).click();
  const slider = page.getByRole("slider");
  const help = main(page).getByRole("note", { name: /^Förklaring:/ });
  const action = page.getByRole("button", { name: "Fortsätt utan bolagsmejl", exact: true });
  const actionY = await action.evaluate(element => element.getBoundingClientRect().top + window.scrollY);
  await page.getByRole("button", { name: "Bara viktigast", exact: true }).hover();
  await expect(help).toContainText("vinstvarningar och stora förvärv");
  await expect(slider).toHaveAttribute("aria-valuetext", "Viktiga");
  expect(state.alertWrites).toEqual([]);
  expect(await action.evaluate(element => element.getBoundingClientRect().top + window.scrollY)).toBeCloseTo(actionY, 0);
  const helpBox = await help.boundingBox(), sliderBox = await slider.boundingBox();
  expect(helpBox.y).toBeGreaterThanOrEqual(sliderBox.y + sliderBox.height);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await slider.focus(); await page.mouse.move(0, 0); await page.keyboard.press("End");
  await expect(slider).toHaveAttribute("aria-valuetext", "Fler relevanta");
  await expect(help).toContainText("betydande insynsaffärer");
  await expect(page.getByRole("switch", { name: "Mejl om mina bolag" })).not.toBeChecked();
  expect(state.alertWrites).toEqual([]);
  for (const theme of ["light", "dark"]) {
    await page.evaluate(async value => {
      document.documentElement.classList.toggle("dark", value === "dark");
      await new Promise(resolve => requestAnimationFrame(resolve));
      await Promise.all(document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getComputedTiming().iterations))
        .map(animation => animation.finished.catch(() => {})));
    }, theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`slider-${width}-${theme}.png`), fullPage: true });
  }
});

test("an unavailable account is retryable, not a create-account form", async ({ page }) => {
  const state = await setup(page, { confirmed: true, accountFailure: 503 });
  await page.goto("/kom-igang");
  await expect(main(page).getByRole("alert")).toContainText("Kontot kunde inte hämtas");
  await expect(page.getByRole("textbox", { name: "E-postadress", exact: true })).toHaveCount(0);
  state.accountFailure = 0;
  await page.getByRole("button", { name: "Hämta kontot igen" }).click();
  await expect(page.getByRole("switch", { name: /^Morgonbrevet/ })).toBeVisible();
  expect(state.letterWrites).toEqual([]); expect(state.alertWrites).toEqual([]);
});

test("a transient account refresh preserves the mounted email draft", async ({ page }) => {
  const state = await setup(page, { confirmed: true, user: { plan: "plus", watchlist: ["NORD.TEST"],
    trial: { status: "active", eligible: false, plan: "plus", endsAt: Date.now() + 604800000 } } });
  await page.goto("/kom-igang");
  await page.getByRole("button", { name: "Fortsätt utan Morgonbrevet", exact: true }).click();
  await page.getByRole("button", { name: "Fortsätt till mejl" }).click();
  const toggle = page.getByRole("switch", { name: "Mejl om mina bolag" });
  await toggle.click();
  await page.getByRole("slider").focus(); await page.keyboard.press("End");
  state.accountFailure = 503;
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(main(page).getByRole("alert")).toContainText("Kontot kunde inte hämtas");
  await expect(toggle).toBeChecked();
  await expect(page.getByRole("slider")).toHaveAttribute("aria-valuetext", "Fler relevanta");
  await expect(page.getByRole("heading", { name: "Håll koll på vad som händer i dina bolag" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Spara och fortsätt" })).toBeDisabled();
  expect(state.alertWrites).toEqual([]);
  state.accountFailure = 0;
  await page.getByRole("button", { name: "Hämta kontot igen" }).click();
  await expect(main(page).getByRole("alert")).toHaveCount(0);
  await expect(toggle).toBeChecked();
  await expect(page.getByRole("slider")).toHaveAttribute("aria-valuetext", "Fler relevanta");
  await page.getByRole("button", { name: "Spara och fortsätt" }).click();
  expect(state.alertWrites[0]).toMatchObject({ enabled: true, importanceLevel: "relevant" });
});

for (const width of [320, 390, 1440]) test(`optional topics ${width}: bounded, searchable and independent of company mail`, async ({ page }, testInfo) => {
  const state = await setup(page, { confirmed: true });
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/bekrafta");
  const disclosure = page.getByRole("button", { name: /^Följ även ämnen/ });
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("textbox", { name: "Sök ämnen" })).toHaveCount(0);
  expect(state.topicRequests).toBe(0);
  await disclosure.click();
  await expect(page.getByRole("textbox", { name: "Sök ämnen" })).toBeVisible();
  expect(await page.getByRole("button", { name: /^Följ ämnet/ }).count()).toBeLessThanOrEqual(6);
  await page.getByRole("textbox", { name: "Sök ämnen" }).fill("teknik");
  await page.getByRole("button", { name: "Följ ämnet Teknik", exact: true }).click();
  await expect(page.getByRole("list", { name: "Valda ämnen" })).toContainText("Teknik");
  expect(state.topicWrites).toEqual([{ topics: ["Technology"] }]);
  expect(state.writes).toEqual([]); expect(state.alertWrites).toEqual([]); expect(state.letterWrites).toEqual([]);
  for (const theme of ["light", "dark"]) {
    await page.evaluate(async value => {
      document.documentElement.classList.toggle("dark", value === "dark");
      await Promise.all(document.getAnimations().filter(a => Number.isFinite(a.effect?.getComputedTiming().iterations)).map(a => a.finished.catch(() => {})));
    }, theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`topics-${width}-${theme}.png`), fullPage: true });
  }
  await disclosure.click();
  await expect(page.getByRole("textbox", { name: "Sök ämnen" })).toHaveCount(0);
  await page.getByRole("button", { name: "Fortsätt", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Din bevakning är klar" })).toBeVisible();
  await expect(main(page).locator("dl")).toContainText("Teknik");
  await expect(page.getByRole("link", { name: "Se mina nyheter", exact: true })).toHaveAttribute("href", "/marknaden/bevakning");
  await expect(page.getByRole("region", { name: "Prova en plan" })).toHaveCount(0);
  expect(state.alertWrites).toEqual([]);
});

test("topic failures preserve selections, retry and never drop unknown saved topics", async ({ page }) => {
  const state = await setup(page, { confirmed: true, topicLoadError: true, user: { topics: ["legacy-id"] } });
  await page.goto("/bekrafta");
  await page.getByRole("button", { name: /^Följ även ämnen/ }).click();
  await expect(main(page).getByRole("alert")).toContainText("Ämnena kunde inte hämtas");
  await expect(page.getByRole("list", { name: "Valda ämnen" })).toContainText("legacy-id");
  state.topicLoadError = false;
  await page.getByRole("button", { name: "Hämta ämnen igen" }).click();
  state.topicSaveError = true;
  await page.getByRole("button", { name: "Följ ämnet Rapporter", exact: true }).click();
  await expect(main(page).getByRole("alert")).toContainText("Ämnet kunde inte sparas");
  expect(state.user.topics).toEqual(["legacy-id"]);
  state.topicSaveError = false;
  await page.getByRole("button", { name: "Följ ämnet Rapporter", exact: true }).click();
  await expect(page.getByRole("list", { name: "Valda ämnen" })).toContainText("Rapporter");
  expect(state.topicWrites.at(-1)).toEqual({ topics: ["legacy-id", "EARNINGS"] });
  await page.getByRole("button", { name: "Ta bort ämnet Rapporter", exact: true }).click();
  await expect(page.getByRole("list", { name: "Valda ämnen" })).not.toContainText("Rapporter");
  expect(state.topicWrites.at(-1)).toEqual({ topics: ["legacy-id"] });
  expect(state.alertWrites).toEqual([]);
});

test("long followed-company lists are bounded and can still be edited", async ({ page }) => {
  const state = await setup(page, { confirmed: true, user: { plan: "premium", watchlist: ["NORD.TEST", "B.TEST", "C.TEST", "D.TEST", "E.TEST", "F.TEST"] } });
  await page.goto("/bekrafta");
  const companies = page.getByRole("list", { name: "Valda bolag" });
  await expect(companies.getByRole("listitem")).toHaveCount(3);
  await page.getByRole("button", { name: "Visa alla 6 bolag" }).click();
  await expect(companies.getByRole("listitem")).toHaveCount(6);
  await page.getByRole("button", { name: "Ta bort F.TEST", exact: true }).click();
  await expect(companies.getByRole("listitem")).toHaveCount(5);
  await page.getByRole("button", { name: "Visa färre bolag" }).click();
  await expect(companies.getByRole("listitem")).toHaveCount(3);
  expect(state.writes).toEqual([{ symbol: "F.TEST", followed: false }]);
});

test("failed newsletter saves stay on step; conflicts need explicit reload; settings reads actual subscriptions", async ({ page }) => {
  const state = await setup(page, { confirmed: true, user: { active_newsletters: ["Morgonbrev"] } });
  await page.goto("/kom-igang");
  await page.getByRole("switch", { name: /^Morgonbrevet(?: på mejl – gratis)?$/ }).click();
  state.letterError = 503;
  await page.getByRole("button", { name: "Spara och fortsätt" }).click();
  await expect(main(page).getByRole("alert")).toBeVisible();
  await expect(page.getByRole("switch", { name: /^Morgonbrevet(?: på mejl – gratis)?$/ })).toBeChecked();
  await expect(page.getByRole("heading", { name: "Vill du få börsmorgonen sammanfattad?" })).toBeVisible();
  state.letterError = 409;
  await page.getByRole("button", { name: "Spara och fortsätt" }).click();
  await expect(main(page).getByRole("alert")).toContainText("ändrats på annat håll");
  await expect(page.getByRole("button", { name: "Spara och fortsätt" })).toBeDisabled();
  state.letterError = 0;
  await page.getByRole("button", { name: "Hämta sparade brevval" }).click();
  await expect(page.getByRole("switch", { name: /^Morgonbrevet(?: på mejl – gratis)?$/ })).not.toBeChecked();
  await page.goto("/settings#letters");
  await expect(page.getByRole("switch", { name: /^Morgonbrevet(?: på mejl – gratis)?$/ })).not.toBeChecked();
  await page.getByRole("switch", { name: /^Morgonbrevet(?: på mejl – gratis)?$/ }).click();
  expect(state.letterWrites).toEqual([]);
  await page.getByRole("button", { name: "Spara brevval", exact: true }).click();
  await expect(main(page)).toContainText("Brevval sparade");
  expect(state.letterWrites).toHaveLength(1);
});

test("guest company choice is carried into the account link without an automatic follow", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/marknaden/bevakning");
  const search = main(page).getByRole("combobox");
  await search.fill("Norden");
  await page.getByRole("option", { name: /Norden Industri/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "E-postadress" }).fill("reader@example.test");
  await dialog.getByRole("button", { name: "Fortsätt med e-post" }).click();
  await expect.poll(() => state.login.length).toBe(1);
  expect(state.login[0].redirectTo).toContain("company=NORD.TEST");
  expect(state.writes).toEqual([]);
});
