import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

function headerValue(key) {
  const all = config.headers.find((h) => h.source === "/(.*)").headers;
  return all.find((h) => h.key === key)?.value;
}

test("every page is sent with basic security headers", () => {
  assert.equal(headerValue("X-Content-Type-Options"), "nosniff");
  assert.equal(headerValue("X-Frame-Options"), "DENY");
  assert.equal(headerValue("Referrer-Policy"), "strict-origin-when-cross-origin");
});

test("the camera stays allowed for the QR check-in scanner, other sensors off", () => {
  const policy = headerValue("Permissions-Policy");
  assert.match(policy, /camera=\(self\)/);
  assert.match(policy, /microphone=\(\)/);
  assert.match(policy, /geolocation=\(\)/);
});

test("the link-preview and single-page rewrites are still there", () => {
  assert.ok(config.rewrites.some((r) => r.destination === "/index.html"));
  assert.ok(config.rewrites.some((r) => String(r.destination).startsWith("/api/preview")));
});
