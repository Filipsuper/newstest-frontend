import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { changeTone, formatChange } from "../app/components/ui/format.js";

test("change badges preserve signs, zero, Swedish decimals and missing values", () => {
  assert.equal(formatChange(2.4), "+2,4 %");
  assert.equal(formatChange(-2.4), "−2,4 %");
  assert.equal(formatChange(0), "0,0 %");
  assert.equal(formatChange(-0), "0,0 %");
  for (const value of [null, undefined, NaN, Infinity, "2.4"]) {
    assert.equal(formatChange(value), "Saknas");
    assert.equal(changeTone(value), "neutral");
  }
  assert.equal(formatChange(null, "Nyhet"), "Nyhet");
  assert.equal(changeTone(0), "neutral");
  assert.equal(changeTone(1), "positive");
  assert.equal(changeTone(-1), "negative");
});

const css = readFileSync(
  new URL("../app/styles/tokens.css", import.meta.url),
  "utf8",
);
function tokens(theme) {
  const match = css.match(
    new RegExp(`\\[data-ui-theme=["']${theme}["']\\]\\s*\\{([^}]+)\\}`),
  );
  assert.ok(match, `Missing ${theme} token declarations`);
  const block = match[1];
  return Object.fromEntries(
    [...block.matchAll(/--ui-([\w-]+):\s*(#[0-9a-f]{6});/g)].map((match) => [
      match[1],
      match[2],
    ]),
  );
}
function luminance(hex) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((value) => parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
for (const theme of ["light", "dark"]) {
  test(`${theme} palette meets text and control contrast targets`, () => {
    const values = tokens(theme);
    const pairs = [
      ["text", "canvas", 4.5],
      ["text-secondary", "canvas", 4.5],
      ["text", "surface", 4.5],
      ["text-secondary", "surface", 4.5],
      ["text", "inset", 4.5],
      ["text-secondary", "inset", 4.5],
      ["on-action", "action", 4.5],
      ["on-action", "action-hover", 4.5],
      ["positive", "positive-soft", 4.5],
      ["negative", "negative-soft", 4.5],
      ["accent", "accent-soft", 4.5],
      ["text-secondary", "accent-soft", 4.5],
      ["focus", "canvas", 3],
      ["focus", "surface", 3],
      ["control-border", "surface", 3],
      ["control-border", "inset", 3],
    ];
    for (const [foreground, background, minimum] of pairs) {
      const ratio = contrast(values[foreground], values[background]);
      assert.ok(
        ratio >= minimum,
        `${foreground} on ${background}: ${ratio.toFixed(2)} < ${minimum}`,
      );
    }
  });
}
