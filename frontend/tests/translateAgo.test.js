import test from "node:test";
import assert from "node:assert/strict";
import { translateAgo } from "../src/utils/translateAgo.js";
import { ne } from "../src/i18n/ne.js";
import { translate, format } from "../src/i18n/translate.js";

const nepali = (text, values) => format(translate(ne, "ne", text), values);

test("relative times are translated, and unknown text passes through", () => {
  assert.equal(translateAgo("just now", (x) => x), "just now");
  assert.equal(translateAgo("5 min ago", (x, v) => format(x, v)), "5 min ago");
  assert.equal(translateAgo("3 h ago", nepali), "3 घण्टा अघि");
  assert.equal(translateAgo("2 d ago", nepali), "2 दिन अघि");
  assert.equal(translateAgo("just now", nepali), "भर्खरै");
  assert.equal(translateAgo("Nov 4, 2026", nepali), "Nov 4, 2026");
});
