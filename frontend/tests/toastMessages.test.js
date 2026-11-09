import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Toast messages are looked up in the Nepali dictionary by their exact English
// text, so "Joined club!" is NOT found by an entry for "Joined club". Every
// plain-text message passed to toast.success / error / info needs its own entry.
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

test("every fixed toast message has a Nepali translation", () => {
  const ne = readFileSync(join(SRC, "i18n", "ne.js"), "utf8");
  const keys = new Set([...ne.matchAll(/^\s*"((?:[^"\\]|\\.)*)":/gm)].map((m) => m[1].replace(/\\"/g, '"')));
  const missing = [];
  for (const file of walk(SRC).filter((p) => /\.jsx?$/.test(p) && !p.includes(join("src", "i18n")))) {
    const source = readFileSync(file, "utf8");
    for (const call of source.matchAll(/toast\.(?:success|error|info)\(([^;]*?)\);/gs)) {
      if (/\bt\(/.test(call[1])) continue; // translated at the call site
      for (const lit of call[1].matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
        const text = lit[2].replace(/\\(["'`])/g, "$1");
        if (text.length < 6 || !text.includes(" ") || text.includes("${") || /^[\w./-]+$/.test(text)) continue;
        if (!keys.has(text)) missing.push(`${file.slice(SRC.length + 1)}: ${text}`);
      }
    }
  }
  assert.deepEqual(missing, [], `Add these to src/i18n/ne.js:\n${missing.join("\n")}`);
});
