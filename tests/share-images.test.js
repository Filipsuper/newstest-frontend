import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ogChange,
  ogThemes,
  ogDate,
  previewText,
} from "../app/og/_shared/theme.js";
import { loadOgFonts } from "../app/og/_shared/fonts.js";
import { formatChange } from "../app/components/ui/format.js";

test("share badges use the UI formatter and distinguish zero from missing data", () => {
  for (const theme of ["light", "dark"]) {
    for (const value of [4.2, -3.8, 0, null, NaN]) {
      const badge = ogChange(value, theme);
      assert.equal(badge.text, formatChange(value));
      const tone = value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
      assert.equal(
        badge.background,
        tone === "neutral"
          ? ogThemes[theme].inset
          : ogThemes[theme][`${tone}Soft`],
      );
    }
    assert.notEqual(ogChange(null, theme).text, ogChange(0, theme).text);
  }
});

test("social image semantic colors stay in sync with the public-site tokens", async () => {
  const css = await readFile(
    new URL("../app/styles/tokens.css", import.meta.url),
    "utf8",
  );
  for (const theme of Object.values(ogThemes)) {
    for (const key of [
      "canvas",
      "text",
      "secondary",
      "inset",
      "positive",
      "positiveSoft",
      "negative",
      "negativeSoft",
    ]) {
      assert.ok(css.includes(theme[key]), `${key}: ${theme[key]}`);
    }
  }
});

test("image text is bounded cleanly and dates use Stockholm time", () => {
  assert.equal(
    previewText("  Ett  bolag\nmed nyheter  ", 50),
    "Ett bolag med nyheter",
  );
  assert.equal(previewText("abcdefghijklmnop", 10), "abcdefghi…");
  const headline = previewText(
    "Bolaget presenterar ett nytt långsiktigt samarbete",
    38,
  );
  assert.ok(headline.length <= 38);
  assert.ok(headline.endsWith("…"));
  assert.equal(ogDate(null), null);
  assert.equal(ogDate("invalid"), null);
  assert.match(
    ogDate("2026-09-07T08:30:00Z", { hour: "2-digit", minute: "2-digit" }),
    /10:30/,
  );
});

test("both share renderers can reuse bundled Geist regular and semibold", async () => {
  const fonts = await loadOgFonts();
  assert.strictEqual(fonts, await loadOgFonts());
  assert.deepEqual(
    fonts.map((font) => [font.name, font.weight]),
    [
      ["Geist", 400],
      ["Geist", 600],
    ],
  );
  fonts.forEach((font) => assert.equal(font.data.readUInt32BE(0), 0x00010000));
});
