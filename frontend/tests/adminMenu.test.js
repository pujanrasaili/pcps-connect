import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Both the admin menu and the club-leader menu must link to the QR check-in
// page (the page is open to both, but it once had a link only for leaders).
const source = readFileSync(new URL("../src/layouts/AdminLayout.jsx", import.meta.url), "utf8");

function block(name) {
  const match = source.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\n\\];`));
  assert.ok(match, `${name} not found in AdminLayout.jsx`);
  return match[1];
}

test("the admin menu links to Check-in", () => {
  assert.match(block("ADMIN_LINKS"), /to: "\/admin\/check-in"/);
});

test("the club-leader menu links to Check-in", () => {
  assert.match(block("LEADER_LINKS"), /to: "\/admin\/check-in"/);
});

test("only the admin menu links to Messages (leaders can't read the inbox)", () => {
  assert.match(block("ADMIN_LINKS"), /to: "\/admin\/messages"/);
  assert.doesNotMatch(block("LEADER_LINKS"), /messages/);
});

test("the Messages route is admin-only", () => {
  const routes = readFileSync(new URL("../src/routes/AppRoutes.jsx", import.meta.url), "utf8");
  assert.match(routes, /path="\/admin\/messages"\s+element=\{\s*<AdminRoute>/);
});
