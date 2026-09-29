import test from "node:test";
import assert from "node:assert/strict";
import { onboardingEmailSummary, onboardingHref, onboardingPreview, restoredOnboardingStep, safeOnboardingReturn } from "../app/utils/onboarding.js";
import { requestNewsletterPreferences } from "../app/utils/newsletterPreferences.js";

test("company intent is bounded and encoded; external redirects are rejected", () => {
  const url = new URL(onboardingHref({ company: "nord.test", returnTo: "/aktie/norden?range=1y#nyheter" }), "https://example.test");
  assert.equal(url.searchParams.get("company"), "NORD.TEST");
  assert.equal(url.searchParams.get("returnTo"), "/aktie/norden?range=1y#nyheter");
  for (const value of ["//evil.test", "/\\evil.test", "/%2Fevil.test", "https://evil.test", "/kom-igang?returnTo=x", null]) assert.equal(safeOnboardingReturn(value), "/marknaden/bevakning");
  assert.equal(onboardingHref({ company: "../bad?symbol=x" }), "/kom-igang");
});
test("preview uses separate important selection and declared period, never guesses complete coverage", () => {
  const data = { sinceHours: 168, stories: [{ id: "routine" }], importantStories: [{ id: "material" }], coverage: { complete: true }, importantCoverage: { complete: false } };
  assert.deepEqual(onboardingPreview(data), { stories: [{ id: "material" }], important: true, period: "Senaste 7 dagarna", complete: false });
  assert.equal(onboardingPreview({ sinceHours: 48, stories: [] }).period, "Senaste 2 dagarna");
  assert.equal(onboardingPreview({ stories: [] }).complete, false);
});
test("the first company preview filters before choosing importance, so topic news cannot hide a company story", () => {
  const data = { importantStories: [{ id: "topic", symbol: "OTHER" }], stories: [{ id: "followed", symbol: "NORD.TEST" }], coverage: { complete: true } };
  const result = onboardingPreview(data, { companySymbols: ["NORD.TEST"], limit: 1 });
  assert.deepEqual(result.stories, [{ id: "followed", symbol: "NORD.TEST" }]);
  assert.equal(result.important, false);
  assert.equal(result.complete, true);
});
test("newsletter requests are credentialled explicit revision writes; unknown response is an error", async () => {
  let request;
  const value = { revision: 0, catalog: [{ id: "morning", title: "Morgonbrevet", description: "Vardagar" }], selected: [] };
  await requestNewsletterPreferences({ draft: { selected: ["morning"], revision: 0 }, fetcher: async (url, options) => { request = options; return { ok: true, json: async () => value }; } });
  assert.equal(request.method, "PUT");
  assert.equal(request.credentials, "include");
  assert.deepEqual(JSON.parse(request.body), { selected: ["morning"], revision: 0 });
  await assert.rejects(requestNewsletterPreferences({ fetcher: async () => ({ ok: true, json: async () => ({}) }) }));
  await assert.rejects(requestNewsletterPreferences({ fetcher: async () => ({ ok: false, status: 409 }) }), { status: 409 });
});
test("restored position is bounded and cannot open a company-email step without a company", () => {
  assert.equal(restoredOnboardingStep("3", { hasCompanies: true, mailStep: true }), 3);
  assert.equal(restoredOnboardingStep("3", { hasCompanies: false, mailStep: true }), 2);
  assert.equal(restoredOnboardingStep("3", { hasCompanies: true, mailStep: false }), 4);
  assert.equal(restoredOnboardingStep(null, { confirmedLetter: true }), 2);
  assert.equal(restoredOnboardingStep("1", { confirmedLetter: true }), 2);
  for (const saved of [null, "bogus", "0", "5", "1.5"]) assert.equal(restoredOnboardingStep(saved), 1);
});
test("completion distinguishes unknown, saved, paused and actually active company-email states", () => {
  const resource = { enabled: true, verified: true, entitlement: { eligible: true }, delivery: { status: "active", available: true } };
  assert.equal(onboardingEmailSummary(null), "Mejlstatus kunde inte hämtas");
  assert.equal(onboardingEmailSummary(resource), "På");
  assert.equal(onboardingEmailSummary({ ...resource, enabled: false }), "Av");
  assert.equal(onboardingEmailSummary({ ...resource, delivery: { status: "service_paused", available: false } }), "Mejlval sparade · inga mejl skickas ännu");
  assert.equal(onboardingEmailSummary({ ...resource, delivery: { status: "resume_required", available: true } }), "Pausade");
  assert.equal(onboardingEmailSummary({ ...resource, entitlement: { eligible: false } }), "Pausade · Plus eller Pro krävs");
});
