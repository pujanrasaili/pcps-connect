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

test("the Messages link shows a badge and the page refreshes it after changes", () => {
  assert.match(block("ADMIN_LINKS"), /to: "\/admin\/messages"[^\n]*badgeKey: "messages"/);
  const page = readFileSync(new URL("../src/pages/admin/AdminMessages.jsx", import.meta.url), "utf8");
  assert.equal((page.match(/pcps:messages-changed/g) || []).length, 2);
  assert.match(source, /addEventListener\("pcps:messages-changed"/);
});

test("the Contact form has a hidden honeypot field that is skipped by keyboard users", () => {
  const page = readFileSync(new URL("../src/pages/Contact.jsx", import.meta.url), "utf8");
  assert.match(page, /name="website"[^>]*tabIndex=\{-1\}/);
  assert.match(page, /aria-hidden="true"/);
});

test("the Contact form's success message is announced to screen readers and stays long enough to read", () => {
  const page = readFileSync(new URL("../src/pages/Contact.jsx", import.meta.url), "utf8");
  assert.match(page, /<div role="status">\s*\{sent && \(/);
  assert.match(page, /setSent\(false\), 10000/);
});

test("Settings' saved confirmation sits in an always-present live region", () => {
  const page = readFileSync(new URL("../src/pages/Settings.jsx", import.meta.url), "utf8");
  assert.match(page, /<div role="status">\s*\{saved && \(/);
});

test("Contact and Forgot-password errors are announced and tied to their fields", () => {
  const contact = readFileSync(new URL("../src/pages/Contact.jsx", import.meta.url), "utf8");
  for (const id of ["c-name", "c-email", "c-message"]) {
    assert.match(contact, new RegExp(`aria-describedby=\\{errors\\.\\w+ \\? "${id}-error"`));
    assert.match(contact, new RegExp(`id="${id}-error" role="alert"`));
  }
  assert.match(contact, /<p role="alert" className="mb-5/);
  const forgot = readFileSync(new URL("../src/pages/ForgotPassword.jsx", import.meta.url), "utf8");
  assert.match(forgot, /aria-describedby=\{error \? "fp-email-error"/);
  assert.match(forgot, /id="fp-email-error" role="alert"/);
});

test("Login, Register and Reset-password errors are announced and tied to their fields", () => {
  const files = {
    "Login.jsx": ["login-email", "login-password"],
    "Register.jsx": ["reg-name", "reg-email", "reg-id", "reg-password", "reg-confirm", "reg-agree"],
    "ResetPassword.jsx": ["rp-password", "rp-confirm"],
  };
  for (const [file, ids] of Object.entries(files)) {
    const src = readFileSync(new URL(`../src/pages/${file}`, import.meta.url), "utf8");
    for (const id of ids) {
      assert.match(src, new RegExp(`aria-describedby=\\{errors\\.\\w+ \\? "${id}-error"`), `${file}: ${id} describedby`);
      assert.match(src, new RegExp(`id="${id}-error" role="alert"`), `${file}: ${id} alert`);
    }
  }
});

test("load and action errors on pages are announced (role=alert)", () => {
  const files = ["components/CheckInQrModal.jsx", "pages/admin/AdminOverview.jsx", "pages/admin/AdminMessages.jsx", "pages/admin/AdminActivity.jsx", "pages/admin/AdminUsers.jsx", "pages/Settings.jsx", "pages/Certificate.jsx", "pages/VerifyCertificate.jsx", "pages/admin/AdminClubs.jsx", "pages/admin/LeaderClubs.jsx", "pages/admin/AdminEvents.jsx"];
  for (const f of files) {
    const src = readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
    const bad = src.split("\n").filter((l) => /<p [^>]*text-rose/.test(l) && !/role="alert"/.test(l) && !/>Delete account</.test(l));
    assert.deepEqual(bad, [], `${f} has an unannounced error line`);
  }
});

test("the Messages page can filter to messages that are still new", () => {
  const page = readFileSync(new URL("../src/pages/admin/AdminMessages.jsx", import.meta.url), "utf8");
  assert.match(page, /aria-pressed=\{showNewOnly === value\}/);
  assert.match(page, /visible\.map\(/);
});

test("the Messages page can be searched by name, email, subject or text", () => {
  const page = readFileSync(new URL("../src/pages/admin/AdminMessages.jsx", import.meta.url), "utf8");
  assert.match(page, /<SearchBar value=\{query\}/);
  assert.match(page, /\[m\.name, m\.email, m\.subject, m\.message\]\.some/);
});
