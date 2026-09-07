import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Isolated account/login/session fixtures. Never contacts the live Terminal,
// starts checkout, sends an email or changes a real account.
async function setup(page, options = {}) {
  const state = {
    user: { email: null, plan: "free" },
    logins: [],
    sessions: 0,
    accountCalls: 0,
    upsellSeen: false,
    writes: [],
    ...options,
  };
  page.on("console", message => {
    if (message.text() === "__test_terminal_paywall_rendered") state.upsellSeen = true;
  });
  await page.addInitScript(() => {
    window.EventSource = class extends EventTarget {
      close() {}
    };
    // Observe the outgoing document without stalling its navigation. This
    // records an accidental paid-user upsell even if it is only a brief flash.
    new MutationObserver(() => {
      if (document.getElementById("terminal-access")) console.debug("__test_terminal_paywall_rendered");
    }).observe(document, { childList: true, subtree: true });
  });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/user") {
      state.accountCalls++;
      if (state.accountGate) await state.accountGate;
      return route.fulfill(
        state.accountError
          ? { status: 503, json: { error: "Unavailable" } }
          : { json: state.user },
      );
    }
    if (url.pathname === "/api/auth/register") {
      state.logins.push(request.postDataJSON());
      return route.fulfill({ json: { success: true } });
    }
    if (url.pathname === "/api/auth/terminal-session") {
      state.sessions++;
      return route.fulfill({
        contentType: "text/html",
        body: "<h1>Terminal handoff fixture</h1>",
      });
    }
    if (request.method() !== "GET") {
      state.writes.push(url.pathname);
      return route.abort();
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

for (const width of [1440, 768, 320]) {
  test(`terminal gateway ${width}: public foundation, both themes, no clipped controls`, async ({
    page,
  }, testInfo) => {
    const state = await setup(page);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/terminal");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText(
      "Nyheter och kursrörelser i samma arbetsyta",
    );
    await expect(
      page.getByRole("link", { name: "OMXsum 2.0 – startsida" }),
    ).toBeVisible();
    await expect(main).toContainText("49 kr");
    await expect(main).toContainText("Ingår också i Pro");
    await expect(main).toContainText("Visar inte aktuella kurser");
    await expect(
      main.getByRole("link", { name: "Se Plus & Pro" }),
    ).toHaveAttribute("href", "/pro");
    await expect(
      main.getByRole("link", { name: "Till den fria marknadsöversikten" }),
    ).toHaveAttribute("href", "/marknaden");
    await expect(main.locator("img")).toBeVisible();
    await expect(main.locator("img")).toHaveJSProperty("complete", true);
    expect(
      await main.locator("img").evaluate((image) => image.naturalWidth),
    ).toBeGreaterThan(0);
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (mode) =>
          document.documentElement.classList.toggle("dark", mode === "dark"),
        theme,
      );
      await expect(page.locator("html")).toHaveClass(/public-palette/);
      await expect(main.getByRole("heading", { level: 1 })).toHaveCSS(
        "font-family",
        /Geist/,
      );
      await expect(main.getByRole("heading", { level: 1 })).toHaveCSS(
        "font-size",
        width === 320 ? "24px" : "32px",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const control of await main.locator("a,button").all()) {
        const box = await control.boundingBox();
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(
          await control.evaluate(
            (element) => element.scrollWidth <= element.clientWidth + 1,
          ),
        ).toBe(true);
      }
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`terminal-${width}-${theme}.png`),
        fullPage: true,
        animations: "disabled",
      });
    }
    expect(state.sessions).toBe(0);
    expect(state.accountCalls).toBeGreaterThan(0);
    expect(state.writes).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("guest sign-in preserves Terminal return path and keyboard focus", async ({
  page,
}) => {
  const state = await setup(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/terminal");
  const trigger = page.getByRole("button", {
    name: "Har du redan Plus? Logga in",
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Logga in för att öppna Terminal",
  });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  await dialog
    .getByRole("textbox", { name: "E-postadress" })
    .fill("reader@example.test");
  await dialog.getByRole("button", { name: "Skicka inloggningslänk" }).click();
  await expect(dialog.getByRole("status")).toContainText(
    "inloggningslänk har skickats",
  );
  expect(state.logins).toEqual([
    { email: "reader@example.test", redirectTo: "/terminal" },
  ]);
  expect(
    (
      await new AxeBuilder({ page })
        .include('[role="dialog"]')
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(state.sessions).toBe(0);
  expect(state.writes).toEqual([]);
});

test("free account sees pricing without redundant sign-in or automatic checkout", async ({
  page,
}) => {
  const state = await setup(page, {
    user: { email: "free@example.test", verified: true, plan: "free" },
  });
  await page.goto("/terminal");
  await expect(
    page.getByRole("main").getByRole("link", { name: "Se Plus & Pro" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Har du redan Plus? Logga in" }),
  ).toHaveCount(0);
  expect(state.sessions).toBe(0);
  expect(state.writes).toEqual([]);
});

test("unresolved account is a neutral loading state, not a guest upsell", async ({
  page,
}) => {
  let release;
  const accountGate = new Promise((resolve) => {
    release = resolve;
  });
  await setup(page, { accountGate });
  await page.goto("/terminal");
  await expect(page.getByRole("main").getByRole("status")).toHaveText(
    "Kontrollerar din åtkomst…",
  );
  await expect(
    page.getByRole("main").getByRole("link", { name: "Se Plus & Pro" }),
  ).toHaveCount(0);
  release();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Se Plus & Pro" }),
  ).toBeVisible();
});

for (const plan of ["plus", "premium"]) {
  test(`${plan} still opens the server-authenticated Terminal session without an upsell`, async ({
    page,
  }) => {
    const state = await setup(page, {
      user: { email: "paid@example.test", verified: true, plan },
    });
    await page.goto("/terminal", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Terminal handoff fixture" }),
    ).toBeVisible();
    expect(state.sessions).toBe(1);
    expect(state.upsellSeen).toBe(false);
    expect(state.writes).toEqual([]);
  });
}

test("account fetch failure never bypasses server authorization", async ({
  page,
}) => {
  const state = await setup(page, { accountError: true });
  await page.goto("/terminal");
  await expect(
    page.getByRole("button", { name: "Har du redan Plus? Logga in" }),
  ).toBeVisible();
  expect(state.sessions).toBe(0);
});
