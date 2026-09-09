import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));

function atLeast(version, minimum) {
  assert.match(version, /^\d+\.\d+\.\d+$/, "Security floors require stable versions");
  const actual = version.split(".").map(Number);
  const floor = minimum.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (actual[i] !== floor[i]) return actual[i] > floor[i];
  }
  return true;
}

// Known advisory floors are a regression guard, not a substitute for npm audit.
test("the lockfile excludes the vulnerable Next 15, Sharp, PostCSS and nanoid versions", () => {
  const floors = { next: "15.5.24", sharp: "0.35.4", postcss: "8.5.23", nanoid: "3.3.18" };
  assert.match(lock.packages["node_modules/next"].version, /^15\.5\./,
    "A framework migration needs its own compatibility and advisory review");
  for (const [name, minimum] of Object.entries(floors)) {
    const entries = Object.entries(lock.packages).filter(([path]) => path.endsWith(`node_modules/${name}`));
    assert.ok(entries.length > 0, `${name} must remain in the lockfile`);
    for (const [path, entry] of entries) assert.ok(atLeast(entry.version, minimum), `${path} is below ${minimum}`);
  }
});

test("the production ARM64 Alpine native packages match the patched runtime", () => {
  assert.equal(lock.packages["node_modules/@next/swc-linux-arm64-musl"].version,
    lock.packages["node_modules/next"].version);
  const binary = lock.packages["node_modules/@img/sharp-linuxmusl-arm64"];
  assert.equal(binary.version, lock.packages["node_modules/sharp"].version);
  assert.ok(binary.optional);
  assert.ok(binary.os.includes("linux"));
  assert.ok(binary.cpu.includes("arm64"));
  assert.ok(lock.packages["node_modules/@img/sharp-libvips-linuxmusl-arm64"]);
});

test("Next loads patched Sharp and optimizes trusted PNG and AVIF input", async () => {
  const { getSharp, optimizeImage } = require("next/dist/server/image-optimizer.js");
  const sharp = getSharp(1);
  assert.ok(atLeast(sharp.versions.sharp, "0.35.4"));
  assert.ok(atLeast(sharp.versions.heif || "0.0.0", "1.23.2"),
    "Next requires the real, patched libheif version before allowing AVIF decoding");
  // Tiny generated pixels only: no remote images or exploit payloads.
  for (const format of ["png", "avif"]) {
    const input = await sharp({ create: { width: 16, height: 8, channels: 3,
      background: { r: 235, g: 196, b: 103 } } }).toFormat(format).toBuffer();
    const output = await optimizeImage({ buffer: input, contentType: "image/webp",
      quality: 75, width: 8, concurrency: 1, timeoutInSeconds: 10 });
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 8);
    assert.equal(metadata.height, 4);
  }
});
