import { readFile } from "node:fs/promises";
import { join } from "node:path";

let fonts;
export function loadOgFonts() {
  fonts ??= Promise.all(
    [
      ["Geist-Regular.ttf", 400],
      ["Geist-SemiBold.ttf", 600],
    ].map(async ([file, weight]) => ({
      name: "Geist",
      weight,
      style: "normal",
      data: await readFile(join(process.cwd(), "public", "fonts", file)),
    })),
  ).catch((error) => {
    fonts = undefined;
    throw error;
  });
  return fonts;
}
