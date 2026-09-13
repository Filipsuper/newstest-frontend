import test from "node:test";
import assert from "node:assert/strict";
import { companyAlertsEnabled, companyAlertDraft, companyAlertStatus, requestCompanyAlerts,
  validateCompanyAlertResource } from "../app/utils/companyAlerts.js";

const resource = () => ({
  revision: 2, enabled: false, importanceLevel: "important", mutedSymbols: ["ONE.TEST"],
  quietHours: { enabled: true, start: "22:00", end: "07:00" }, timeZone: "Europe/Stockholm",
  destination: "reader@example.test", verified: true, entitlement: { eligible: true, companyLimit: 10 },
  delivery: { status: "off", available: false }, batching: { windowSeconds: 120, maxWaitSeconds: 300 },
});

test("alert UI is off unless its explicit public feature flag is true", () => {
  const before = process.env.NEXT_PUBLIC_COMPANY_ALERTS_ENABLED;
  try {
    for (const value of [undefined, "", "1", "false", "TRUE"]) {
      if (value === undefined) delete process.env.NEXT_PUBLIC_COMPANY_ALERTS_ENABLED;
      else process.env.NEXT_PUBLIC_COMPANY_ALERTS_ENABLED = value;
      assert.equal(companyAlertsEnabled(), false);
    }
    process.env.NEXT_PUBLIC_COMPANY_ALERTS_ENABLED = "true";
    assert.equal(companyAlertsEnabled(), true);
  } finally {
    if (before === undefined) delete process.env.NEXT_PUBLIC_COMPANY_ALERTS_ENABLED;
    else process.env.NEXT_PUBLIC_COMPANY_ALERTS_ENABLED = before;
  }
});

test("editing serializes only preferences and revision, never account/entitlement/delivery fields", () => {
  const source = resource();
  const draft = companyAlertDraft(source);
  assert.deepEqual(Object.keys(draft).sort(), ["revision", "enabled", "importanceLevel", "mutedSymbols", "quietHours", "timeZone"].sort());
  draft.mutedSymbols.push("TWO.TEST"); draft.quietHours.start = "21:00";
  assert.deepEqual(source.mutedSymbols, ["ONE.TEST"]);
  assert.equal(source.quietHours.start, "22:00");
});

test("unavailable, missing and malformed server preferences never become off defaults", () => {
  assert.equal(validateCompanyAlertResource(resource()).revision, 2);
  for (const value of [null, {}, { ...resource(), revision: -1 }, { ...resource(), enabled: "true" },
    { ...resource(), importanceLevel: "all" }, { ...resource(), quietHours: { enabled: true, start: "25:00", end: "07:00" } },
    { ...resource(), destination: null }, { ...resource(), delivery: { available: false, status: "unknown" } },
    { ...resource(), entitlement: null }, { ...resource(), mutedSymbols: [4] }]) {
    assert.throws(() => validateCompanyAlertResource(value));
  }
});

test("saved opt-in is not presented as working delivery while transport is unavailable", () => {
  assert.equal(companyAlertStatus(resource()), "Välj mejlbevakning");
  const saved = { ...resource(), enabled: true, delivery: { available: false, status: "service_paused" } };
  assert.equal(companyAlertStatus(saved), "Mejlval sparade");
  assert.doesNotMatch(companyAlertStatus(saved), /Mejl på/);
  assert.equal(companyAlertStatus({ ...saved, delivery: { available: true, status: "active" } }), "Mejl på · Viktiga nyheter");
});

test("unverified, over-cap, muted and resume states retain their distinct meaning", () => {
  for (const [status, label] of [["requires_verification", "Bekräfta din mejladress"],
    ["over_limit", "Välj upp till 10 bolag för mejl"], ["all_muted", "Inga bolag får mejl just nu"],
    ["resume_required", "Mejl pausade · Återuppta"], ["no_companies", "Välj bolag för mejl"]]) {
    assert.equal(companyAlertStatus({ ...resource(), delivery: { available: false, status } }), label);
  }
});

test("GET and PUT use the authenticated API, no-store and safe editable body", async () => {
  const calls = [];
  const fetcher = async (...args) => { calls.push(args); return Response.json(resource()); };
  await requestCompanyAlerts({ baseUrl: "http://127.0.0.1:8100/api/", fetcher });
  await requestCompanyAlerts({ baseUrl: "/api", fetcher, draft: { ...resource(), enabled: true, plan: "premium" } });
  assert.equal(calls[0][0], "http://127.0.0.1:8100/api/user/company-alerts");
  assert.equal(calls[0][1].credentials, "include");
  assert.equal(calls[0][1].cache, "no-store");
  assert.equal(calls[0][1].method, "GET");
  assert.equal(calls[1][1].method, "PUT");
  assert.equal(JSON.parse(calls[1][1].body).enabled, true);
  assert.equal(JSON.parse(calls[1][1].body).revision, 2);
  assert.equal(JSON.parse(calls[1][1].body).plan, undefined);
  assert.equal(JSON.parse(calls[1][1].body).destination, undefined);
});

test("conflicts and access failures retain status but do not render raw backend error text", async () => {
  for (const status of [400, 401, 403, 404, 409, 422, 500]) {
    await assert.rejects(requestCompanyAlerts({ fetcher: async () => Response.json({ error: "private stack trace" }, { status }) }),
      (error) => error.status === status && !error.message.includes("private stack trace"));
  }
});

test("request timeout is bounded; explicit cancellation remains cancellation", async () => {
  const fetcher = (_url, { signal }) => new Promise((_resolve, reject) => {
    const abort = () => reject(new DOMException("Aborted", "AbortError"));
    if (signal.aborted) abort(); else signal.addEventListener("abort", abort, { once: true });
  });
  await assert.rejects(requestCompanyAlerts({ fetcher, timeoutMs: 10 }), /för lång tid/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(requestCompanyAlerts({ fetcher, signal: controller.signal }), { name: "AbortError" });
});
