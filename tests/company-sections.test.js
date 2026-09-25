import test from "node:test";
import assert from "node:assert/strict";
import { COMPANY_SECTIONS, companySection, companySectionHref } from "../app/utils/companySections.js";

test("company report preserves section identifiers and rejects unknown anchors", () => {
  assert.equal(COMPANY_SECTIONS.length, 10);
  assert.deepEqual(COMPANY_SECTIONS.slice(2, 5).map(section => section.id), ['profile', 'financials', 'management']);
  assert.ok(!COMPANY_SECTIONS.find(section => section.id === 'profile').plus);
  for (const { id } of COMPANY_SECTIONS) assert.equal(companySection(`#${id}`), id);
  assert.equal(companySection("javascript:evil"), "overview");
  assert.equal(companySection(null), "overview");
});
test("section links preserve chart and share state and translate old tabs", () => {
  assert.equal(companySectionHref("/aktie/NORD.TEST", "?tab=news&range=6m&ma=50%2C200&share=2", "insiders"), "/aktie/NORD.TEST?range=6m&ma=50%2C200&share=2#insiders");
  assert.equal(companySectionHref("/aktie/NORD.TEST", "", "news"), "/aktie/NORD.TEST#news");
});
