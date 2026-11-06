import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
const routes = readFileSync(new URL("../src/routes/AppRoutes.jsx", import.meta.url), "utf8");

test("the install manifest has what browsers need to offer installation", () => {
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.ok(manifest.name && manifest.short_name);
  const sizes = manifest.icons.map((i) => i.sizes);
  assert.ok(sizes.includes("192x192") && sizes.includes("512x512"));
});

test("every icon file named in the manifest exists", () => {
  const icons = [...manifest.icons, ...manifest.shortcuts.flatMap((s) => s.icons || [])];
  for (const icon of icons) assert.ok(existsSync(new URL(`../public${icon.src}`, import.meta.url)), icon.src);
});

test("home-screen shortcuts open real pages inside the app scope", () => {
  assert.ok(manifest.shortcuts.length >= 1 && manifest.shortcuts.length <= 4);
  for (const shortcut of manifest.shortcuts) {
    assert.ok(shortcut.url.startsWith(manifest.scope), shortcut.url);
    assert.ok(shortcut.name && shortcut.name.length <= 25, shortcut.name);
    assert.ok(routes.includes(`path="${shortcut.url}"`), `no route for ${shortcut.url}`);
  }
});
