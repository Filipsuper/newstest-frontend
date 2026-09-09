import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Run after `npm run build`: exercise the traced runtime, not the development
// dependency tree. Missing libvips version metadata must fail this check.
const root = new URL("../.next/standalone/", import.meta.url);
const require = createRequire(new URL("package.json", root));
const optimizerPath = require.resolve("next/dist/server/image-optimizer.js");
assert.ok(optimizerPath.startsWith(fileURLToPath(root)), "Build the standalone output first");
const sharpPath = createRequire(optimizerPath).resolve("sharp");
assert.ok(sharpPath.startsWith(fileURLToPath(root)), "Sharp must resolve inside the standalone output");
const sharpRequire = createRequire(sharpPath);
const platform = sharpRequire("./libvips.cjs").runtimePlatformArch();
const metadataPath = sharpRequire.resolve(`@img/sharp-libvips-${platform}/versions`);
assert.ok(metadataPath.startsWith(fileURLToPath(root)), "Codec metadata must not come from the development tree");
const { getSharp, optimizeImage } = require(optimizerPath);
const sharp = getSharp(1);
assert.ok(sharp.versions.heif, "Standalone output must retain the real libheif version metadata");
const [major, minor, patch] = sharp.versions.heif.split(".").map(Number);
assert.ok(major > 1 || (major === 1 && (minor > 23 || (minor === 23 && patch >= 2))),
  "AVIF requires a patched libheif version");

for (const format of ["png", "avif"]) {
  const input = await sharp({ create: { width: 16, height: 8, channels: 3,
    background: "#ebc467" } }).toFormat(format).toBuffer();
  const output = await optimizeImage({ buffer: input, contentType: "image/webp",
    quality: 75, width: 8, concurrency: 1, timeoutInSeconds: 10 });
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 8);
  assert.equal(metadata.height, 4);
  console.log(`Standalone ${format} → WebP passed (libheif ${sharp.versions.heif})`);
}
