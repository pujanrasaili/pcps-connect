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

test("the service worker file is never cached by the browser, so updates reach everyone", () => {
  const entry = config.headers.find((h) => h.source === "/sw.js");
  assert.ok(entry, "sw.js needs its own header block");
  assert.equal(entry.headers.find((h) => h.key === "Cache-Control")?.value, "no-cache");
});

test("the Content-Security-Policy allows exactly the inline theme script in index.html", async () => {
  const { createHash } = await import("node:crypto");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(inline.length, 1, "index.html should have exactly one inline script");
  const hash = "sha256-" + createHash("sha256").update(inline[0][1]).digest("base64");
  const csp = headerValue("Content-Security-Policy");
  // If this fails you edited the inline script: put the new hash in vercel.json,
  // otherwise browsers block it and dark mode flashes white on every load.
  assert.ok(csp.includes(`'${hash}'`), `CSP is missing '${hash}'`);
});

test("the Content-Security-Policy blocks other scripts, plugins and framing", () => {
  const csp = headerValue("Content-Security-Policy");
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /script-src 'self' 'sha256-[^']+'(;|$)/);
  assert.doesNotMatch(csp, /script-src[^;]*unsafe-(inline|eval)/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /base-uri 'self'/);
});
