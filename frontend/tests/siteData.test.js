import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];

test("the page carries valid site data naming the college and the website", () => {
  assert.ok(block, "a JSON-LD block exists");
  const data = JSON.parse(block);
  const types = data["@graph"].map((x) => x["@type"]);
  assert.deepEqual(types, ["CollegeOrUniversity", "WebSite"]);
  const [org, site] = data["@graph"];
  assert.equal(site.publisher["@id"], org["@id"]);
  assert.match(org.url, /^https:\/\/pcps-connect\.vercel\.app\/$/);
  assert.equal(site.name, "PCPS Connect");
});

test("the data block is not a script the security policy needs to allow", () => {
  // JSON-LD is data, so the policy's script hash only has to cover the one inline script.
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/g)];
  assert.equal(inline.length, 1);
});
