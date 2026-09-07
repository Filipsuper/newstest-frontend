import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Fake account and checkout responses only; no Stripe sessions or emails.
async function setup(page, options = {}) {
  const state = {
    user: { email: "member@example.test", verified: true, plan: "free" },
    checkout: [],
    logins: [],
    accountCalls: 0,
    checkoutError: false,
    ...options,
  };
  await page.addInitScript(() => {
    window.EventSource = class extends EventTarget {
      close() {}
    };
  });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/user") {
      state.accountCalls++;
      if (state.accountGate) await state.accountGate;
      return route.fulfill({ json: state.user });
    }
    if (url.pathname === "/api/stripe/create-checkout-session") {
      expect(request.method()).toBe("POST");
      state.checkout.push(request.postDataJSON());
      if (state.checkoutGate) await state.checkoutGate;
      return route.fulfill(
        state.checkoutError
          ? { status: 503, json: { error: "Unavailable" } }
          : {
              json: {
                url:
                  state.checkoutUrl ||
                  "https://checkout.stripe.com/c/pay/cs_test_fixture",
              },
            },
      );
    }
    if (url.pathname === "/api/auth/register") {
      state.logins.push(request.postDataJSON());
      return route.fulfill({ json: { success: true } });
    }
    if (url.hostname === "checkout.stripe.com")
      return route.fulfill({
        contentType: "text/html",
        body: "<h1>Fictional checkout</h1>",
      });
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

const main = (page) => page.locator("main:visible");
const plan = (page, name) =>
  main(page).getByRole("region", { name, exact: true });
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

for (const width of [1440, 390, 320]) {
  test(`membership ${width}: clear plans, readable controls and both themes`, async ({
    page,
  }, testInfo) => {
    const state = await setup(page),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/pro");
    await expect(main(page).getByRole("status")).toHaveText("Din plan: Gratis");
    await expect(plan(page, "Gratis")).toContainText("0 kr");
    await expect(plan(page, "Plus")).toContainText("49 kr");
    await expect(plan(page, "Pro")).toContainText("99 kr");
    await expect(plan(page, "Plus")).toContainText("Tillgång till Terminal");
    await expect(plan(page, "Pro")).toContainText("100 bolag");
    await expect(main(page)).not.toContainText("Realtidsdata");
    expect(state.checkout).toEqual([]);
    const freeBox = await plan(page, "Gratis").boundingBox();
    const plusBox = await plan(page, "Plus").boundingBox();
    if (width === 1440) expect(Math.abs(freeBox.y - plusBox.y)).toBeLessThan(2);
    else expect(plusBox.y).toBeGreaterThan(freeBox.y + freeBox.height);
    for (const theme of ["light", "dark"]) {
      await settleTheme(page, theme);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const button of await main(page).getByRole("button").all()) {
        expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
      }
      expect(
        (
          await new AxeBuilder({ page })
            .include("main")
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`membership-${width}-${theme}.png`),
        fullPage: true,
        animations: "disabled",
      });
    }
    expect(errors).toEqual([]);
  });
}

test("guest plan selection signs in first, returns to pricing and restores keyboard focus", async ({
  page,
}, testInfo) => {
  const state = await setup(page, { user: { email: null, plan: "free" } });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/pro");
  const choose = plan(page, "Plus").getByRole("button", { name: "Välj Plus" });
  await choose.click();
  const dialog = page.getByRole("dialog", {
    name: "Logga in för att välja Plus",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("bekräftar betalningen efter inloggning");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(choose).toBeFocused();
  await page.keyboard.press("Enter");
  await dialog
    .getByRole("textbox", { name: "E-postadress" })
    .fill("reader@example.test");
  await dialog.getByRole("button", { name: "Skicka inloggningslänk" }).click();
  await expect(dialog.getByRole("status")).toContainText(
    "inloggningslänk har skickats",
  );
  expect(state.logins).toEqual([
    { email: "reader@example.test", redirectTo: "/pro" },
  ]);
  expect(state.checkout).toEqual([]);
  await expect(dialog).not.toHaveAttribute("data-starting-style");
  await expect(dialog).toHaveCSS("opacity", "1");
  expect(
    (
      await new AxeBuilder({ page })
        .include('[role="dialog"]')
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("membership-login-mobile.png"),
    animations: "disabled",
  });
});

test("account loading blocks checkout and failures are retryable without duplicate sessions", async ({
  page,
}) => {
  let accountReady, checkoutReady;
  const state = await setup(page, {
    accountGate: new Promise((resolve) => {
      accountReady = resolve;
    }),
    checkoutGate: new Promise((resolve) => {
      checkoutReady = resolve;
    }),
    checkoutError: true,
  });
  await page.goto("/pro");
  const plus = plan(page, "Plus").getByRole("button", { name: "Välj Plus" });
  const pro = plan(page, "Pro").getByRole("button", { name: "Välj Pro" });
  await expect(main(page).getByRole("status")).toHaveText("Hämtar din plan…");
  await expect(plus).toBeDisabled();
  await expect(pro).toBeDisabled();
  accountReady();
  await expect(plus).toBeEnabled();
  await plus.click();
  await expect(plan(page, "Plus").getByRole("button")).toBeDisabled();
  await expect(pro).toBeDisabled();
  await expect.poll(() => state.checkout.length).toBe(1);
  checkoutReady();
  await expect(plan(page, "Plus").getByRole("alert")).toHaveText(
    "Kassan kunde inte öppnas. Försök igen.",
  );
  await expect(plus).toBeEnabled();
  await expect(pro).toBeEnabled();
  state.checkoutError = false;
  state.checkoutUrl = "https://example.test/not-checkout";
  await pro.click();
  await expect(plan(page, "Pro").getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/pro$/);
  state.checkoutUrl = null;
  await plus.click();
  await expect(page).toHaveURL(
    "https://checkout.stripe.com/c/pay/cs_test_fixture",
  );
  expect(state.checkout).toEqual([
    { tier: "plus" },
    { tier: "pro" },
    { tier: "plus" },
  ]);
});

for (const [internal, display] of [
  ["plus", "Plus"],
  ["premium", "Pro"],
]) {
  test(`${display} members manage the existing subscription, never start another checkout`, async ({
    page,
  }) => {
    const state = await setup(page, {
      user: { email: "paid@example.test", verified: true, plan: internal },
    });
    await page.goto("/pro");
    await expect(main(page).getByRole("status")).toHaveText(
      `Din plan: ${display}`,
    );
    await expect(
      plan(page, display).getByRole("button", { name: "Din nuvarande plan" }),
    ).toBeDisabled();
    await expect(
      main(page).getByRole("button", { name: /^Välj / }),
    ).toHaveCount(0);
    if (internal === "plus")
      await expect(
        plan(page, "Pro").getByRole("link", { name: "Hantera din plan" }),
      ).toHaveAttribute("href", "/settings");
    else
      await expect(
        plan(page, "Plus").getByRole("button", { name: "Ingår i Pro" }),
      ).toBeDisabled();
    await main(page)
      .getByRole("link", { name: "Hantera prenumeration" })
      .click();
    await expect(page).toHaveURL(/\/settings$/);
    expect(state.checkout).toEqual([]);
  });
}

test("checkout return waits for verified access, stops polling and offers recovery", async ({
  page,
}, testInfo) => {
  const state = await setup(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/pro/klart");
  await expect(main(page).getByRole("heading", { level: 1 })).toHaveText(
    "Kontrollerar din plan…",
  );
  await expect(main(page)).not.toContainText("Tack för ditt köp");
  await expect(
    main(page).getByRole("link", { name: "Öppna nyhetsflödet" }),
  ).toHaveCount(0);
  await expect(main(page).getByRole("heading", { level: 1 })).toHaveText(
    "Din plan har inte uppdaterats än",
    { timeout: 12000 },
  );
  expect(state.accountCalls).toBe(4);
  expect(state.checkout).toEqual([]);
  await expect(main(page)).toContainText("Starta inte ett nytt köp");
  state.user = { ...state.user, plan: "plus" };
  await main(page).getByRole("button", { name: "Kontrollera igen" }).click();
  await expect(main(page).getByRole("heading", { level: 1 })).toHaveText(
    "Din plan är redo",
  );
  await expect(main(page).getByRole("status")).toContainText(
    "Plus är aktivt på ditt konto",
  );
  await expect(
    main(page).getByRole("link", { name: "Öppna nyhetsflödet" }),
  ).toHaveAttribute("href", "/marknaden/nyheter");
  for (const theme of ["light", "dark"]) {
    await settleTheme(page, theme);
    expect(
      (
        await new AxeBuilder({ page })
          .include("main")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`membership-ready-${theme}.png`),
      fullPage: true,
      animations: "disabled",
    });
  }
  await page.reload();
  await expect(main(page).getByRole("status")).toContainText("Plus är aktivt");
  expect(state.checkout).toEqual([]);
});

test("a guest visiting the return URL is never told they paid", async ({
  page,
}) => {
  const state = await setup(page, {
    user: { email: null, verified: false, plan: "free" },
  });
  await page.goto("/pro/klart?success=true&plan=pro");
  await expect(main(page).getByRole("heading", { level: 1 })).toHaveText(
    "Kontrollera din prenumeration",
  );
  await expect(main(page)).not.toContainText("Din plan är redo");
  await main(page).getByRole("button", { name: "Kontrollera igen" }).click();
  // A guest response is still not proof of an active account or subscription.
  await expect(main(page)).not.toContainText("Pro är aktivt");
  await main(page)
    .getByRole("button", { name: "Logga in", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Logga in på OMXsum" });
  await dialog
    .getByRole("textbox", { name: "E-postadress" })
    .fill("reader@example.test");
  await dialog.getByRole("button", { name: "Skicka inloggningslänk" }).click();
  await expect(dialog.getByRole("status")).toBeVisible();
  expect(state.logins[0].redirectTo).toBe("/pro/klart");
  expect(state.checkout).toEqual([]);
});
