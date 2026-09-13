import test from "node:test";
import assert from "node:assert/strict";
import { letterShareContent, letterShareImageHref, LETTER_OG_VERSION } from "../app/utils/letterSharing.js";

test("letter previews retain their saved date, edition and signed broker figures", () => {
  const preview = letterShareContent({
    title: "Industrin tar täten",
    introText: "&&Industrin&& växer. Läs [källan](https://example.test).",
    createdAt: "2026-09-07T22:30:00Z",
    isEveningLetter: true,
    omxPrice: "2 583,40",
    omxChangePercentage: "−1,2 %",
  });
  assert.equal(preview.edition, "Kvällsbrevet");
  assert.equal(preview.date, "8 sep. 2026");
  assert.equal(preview.excerpt, "Industrin växer. Läs källan.");
  assert.equal(preview.quote, "2 583,40");
  assert.equal(preview.change, -1.2);
});

test("unavailable letter data never invents an edition, current date or zero change", () => {
  for (const article of [null, { success: false }]) {
    const preview = letterShareContent(article);
    assert.equal(preview.edition, "Breven");
    assert.equal(preview.date, null);
    assert.equal(preview.quote, "");
    assert.equal(preview.change, null);
  }
  assert.equal(letterShareContent({ omxChangePercentage: "0,0%" }).change, 0);
  assert.equal(letterShareContent({ omxChangePercentage: "Saknas" }).change, null);
  assert.equal(letterShareContent({ createdAt: "invalid" }).date, null);
});

test("long letter headlines and plain-text excerpts fit the social composition", () => {
  const preview = letterShareContent({
    title: "Rapporter och räntor inför börsdagen ".repeat(9),
    summary: "##Marknaden## &&Industrin&& tar täten. ".repeat(20),
  });
  assert.ok(preview.title.length <= 164);
  assert.ok(preview.excerpt.length <= 140);
  assert.ok(preview.title.endsWith("…"));
  assert.ok(preview.excerpt.endsWith("…"));
  assert.doesNotMatch(preview.excerpt, /&&|##/);
});

test("only the article artwork URL is versioned, preserving its title slug", () => {
  const url = new URL(letterShareImageHref("Räntor-och-rapporter"), "https://omxsum.com");
  assert.equal(url.pathname, "/article/R%C3%A4ntor-och-rapporter/opengraph-image");
  assert.equal(url.searchParams.get("v"), LETTER_OG_VERSION);
});

test("encoded metadata segments retain Swedish characters without double encoding", () => {
  for (const title of ["Räntor-och-rapporter", "Upp-20%-på-börsen", "Literal-%20-text"]) {
    assert.equal(letterShareImageHref(encodeURIComponent(title), { encoded: true }),
      letterShareImageHref(title));
  }
  assert.ok(letterShareImageHref("bad%escape", { encoded: true }).includes("bad%25escape"));
});
