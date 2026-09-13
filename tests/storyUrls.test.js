import test from "node:test";
import assert from "node:assert/strict";
import { storyHref, storyIdFromPath, storySlug } from "../app/utils/storyUrls.js";

test("news links use readable Swedish headlines and retain the exact story identity", () => {
  const id = "story_859209d5a76c62711911b7481091f67a";
  const url = storyHref(id, "Dynavox Group: Fredrik Gustaf Otto Ruben köper aktier");
  assert.equal(url, `/nyhet/dynavox-group-fredrik-gustaf-otto-ruben-koper-aktier~${id}`);
  assert.equal(storyIdFromPath(url.slice("/nyhet/".length)), id);
  assert.equal(storySlug("ÅÄÖ – Øresund & Ægir: 12,5 %"), "aao-oresund-aegir-12-5");
});

test("duplicate or revised headlines still resolve to their original stories", () => {
  assert.notEqual(storyHref("story-one", "Ny rapport"), storyHref("story-two", "Ny rapport"));
  for (const title of ["Gammal rubrik", "Ny rubrik", ""])
    assert.equal(storyIdFromPath(storyHref("legacy--id", title).slice(7)), "legacy--id");
  assert.equal(storyIdFromPath("legacy--id"), "legacy--id");
  assert.equal(storyIdFromPath("story_123"), "story_123");
});

test("empty headlines retain legacy URLs and long headlines remain bounded", () => {
  assert.equal(storyHref("story-1", "!? 🎉"), "/nyhet/story-1");
  const slug = storySlug("Bolaget publicerar en ny rapport ".repeat(40));
  assert.ok(slug.length <= 120);
  assert.ok(!slug.endsWith("-"));
  assert.equal(storyIdFromPath(storyHref("story-1", "a".repeat(500)).slice(7)), "story-1");
});

test("route parsing rejects malformed segments and path injection", () => {
  for (const segment of [null, [], "", "../settings", "a/b", "%2e%2e", "headline~", "~id", "a~id~other", "a~../id", `${"a".repeat(121)}~id`, `a~${"b".repeat(81)}`])
    assert.equal(storyIdFromPath(segment), null, String(segment));
  assert.equal(storyHref("../settings", "Valid title"), null);
});
