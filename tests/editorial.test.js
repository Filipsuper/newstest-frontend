import test from "node:test";
import assert from "node:assert/strict";
import {
  articleHref,
  letterBlocks,
  latestEdition,
  letterChange,
} from "../app/utils/editorial.js";

test("article URLs preserve the existing Swedish title-slug contract", () => {
  assert.equal(
    articleHref("Börsbrev - en dag"),
    "/article/B%C3%B6rsbrev-_-en-dag",
  );
  assert.equal(articleHref("A/B? C"), "/article/A%2FB%3F-C");
});
test("letter headings are block content, never nested in paragraphs", () => {
  assert.deepEqual(letterBlocks("Ingress\n##Börsen##\nText med **styrka**"), [
    { type: "paragraph", text: "Ingress" },
    { type: "heading", text: "Börsen" },
    { type: "paragraph", text: "Text med **styrka**" },
  ]);
  assert.deepEqual(letterBlocks(null), []);
});
test("edition freshness uses full Stockholm dates, not weekdays or fixed UTC offsets", () => {
  const old = { createdAt: "2026-09-06T06:00:00Z", isEveningLetter: false };
  assert.equal(
    latestEdition([old], false, "2026-09-13T07:00:00Z").isToday,
    false,
  );
  const winter = { createdAt: "2026-12-04T23:15:00Z", isEveningLetter: true };
  assert.equal(
    latestEdition([winter], true, "2026-12-04T23:30:00Z").isToday,
    true,
  );
  assert.equal(
    latestEdition([winter], false, "2026-12-04T23:30:00Z").article,
    null,
  );
});
test("editorial percentages preserve Swedish formatting and missing values", () => {
  assert.equal(letterChange("−1,2 %"), -1.2);
  assert.equal(letterChange("0,0%"), 0);
  assert.equal(letterChange(undefined), null);
  assert.equal(letterChange("saknas"), null);
});
