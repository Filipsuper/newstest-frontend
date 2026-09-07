import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SITE_OG_IMAGE } from "../app/utils/brand.js";

test("site sharing artwork has a cache-versioned URL and an explicit public snapshot", async () => {
  const url = new URL(SITE_OG_IMAGE.url, "https://omxsum.com");
  assert.equal(url.pathname, "/og/home");
  assert.ok(url.searchParams.get("v"));
  assert.equal(SITE_OG_IMAGE.width, 1200);
  assert.equal(SITE_OG_IMAGE.height, 630);
  const preview = JSON.parse(
    await readFile(
      new URL("../app/og/home/preview.json", import.meta.url),
      "utf8",
    ),
  );
  const captured = Date.parse(preview.capturedAt);
  assert.ok(Number.isFinite(captured));
  assert.equal(
    preview.sourceUrl,
    "https://omxsum.com/api/feed/market-overview",
  );
  assert.equal(preview.stories.length, 2);
  for (const story of preview.stories) {
    assert.match(story.id, /^story_[a-z0-9]+$/);
    assert.ok(Date.parse(story.publishedAt) <= captured);
    assert.ok(story.headline.length > 0);
    assert.equal(new URL(story.source.url).protocol, "https:");
    if (story.reaction.pct !== null) {
      assert.ok(Number.isFinite(story.reaction.pct));
      assert.ok(story.reaction.asOf >= Date.parse(story.publishedAt));
      assert.ok(story.reaction.asOf <= captured);
    }
  }
});

test("OG fonts are bundled TrueType assets with their redistribution license", async () => {
  for (const weight of ["Regular", "SemiBold"]) {
    const font = await readFile(
      new URL(`../public/fonts/Geist-${weight}.ttf`, import.meta.url),
    );
    assert.equal(font.readUInt32BE(0), 0x00010000);
  }
  const license = await readFile(
    new URL("../public/fonts/OFL.txt", import.meta.url),
    "utf8",
  );
  assert.match(license, /SIL OPEN FONT LICENSE Version 1.1/);
});
