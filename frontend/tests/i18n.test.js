import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { translate, format, normalizeLang } from "../src/i18n/translate.js";
import { ne } from "../src/i18n/ne.js";

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const FILES = [
  "components/Navbar.jsx", "components/Footer.jsx", "components/HeroSection.jsx", "components/EventCard.jsx",
  "components/ClubCard.jsx", "components/LanguageToggle.jsx", "pages/Home.jsx", "pages/Login.jsx", "pages/Events.jsx", "pages/Clubs.jsx", "components/FilterButtons.jsx", "pages/Register.jsx", "pages/Contact.jsx", "pages/ForgotPassword.jsx", "pages/ResetPassword.jsx",
];

test("English stays English, Nepali is looked up, and unknown text falls back to English", () => {
  assert.equal(translate(ne, "en", "Events"), "Events");
  assert.equal(translate(ne, "ne", "Events"), "कार्यक्रमहरू");
  assert.equal(translate(ne, "ne", "Some brand new sentence"), "Some brand new sentence");
  assert.equal(translate(ne, "ne", "constructor"), "constructor"); // no prototype leaks
  assert.equal(translate(ne, "ne", undefined), undefined);
});

test("placeholders are filled, and left alone when no value is given", () => {
  assert.equal(format("{n} spots left", { n: 3 }), "3 spots left");
  assert.equal(format(translate(ne, "ne", "{n} spots left"), { n: 3 }), "3 सिट बाँकी");
  assert.equal(format("Hello {name}"), "Hello {name}");
});

test("only known languages are accepted", () => {
  assert.equal(normalizeLang("ne"), "ne");
  assert.equal(normalizeLang("en"), "en");
  assert.equal(normalizeLang("fr"), "en");
  assert.equal(normalizeLang(null), "en");
});

test("every string wrapped in t(\"...\") on the translated pages has a Nepali version", () => {
  const missing = [];
  for (const file of FILES) {
    for (const m of read(file).matchAll(/\bt\("((?:[^"\\]|\\.)*)"/g)) {
      const key = m[1].replace(/\\'/g, "'");
      if (!(key in ne)) missing.push(`${file}: ${key}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("labels that reach t() through variables are translated too", () => {
  const dynamic = [
    "Home", "Clubs", "Events", "Contact", "Dashboard", "Admin", "Manage",
    "Login", "Register", "Forgot Password", "Profile", "Settings", "Help & FAQ", "Terms of Use", "Privacy Policy",
    "Active Clubs", "Members", "Events Hosted", "Registered Students", "Event Registrations",
    "Upcoming", "This week", "Past", "Registered", "Saved", "List", "Calendar",
    "Joined", "Request sent", "Request to join", "Join Club", "Tap to leave this club",
    "Waiting for the club's leaders. Tap to withdraw", "Free", "Default order", "Most members", "Name (A-Z)",
    "Full name is required.", "Enter a valid email address.", "Registration is limited to PCPS email addresses (@patancollege.edu.np).",
    "Student ID is required.", "Password must be at least 8 characters.", "Passwords do not match.", "You must accept the terms to continue.",
    "Name is required.", "Enter a valid email.", "Please write a message.",
  ];
  assert.deepEqual(dynamic.filter((k) => !(k in ne)), []);
});

test("each translation keeps the same {placeholders} as its English text", () => {
  const ph = (text) => (text.match(/\{\w+\}/g) || []).sort().join(",");
  for (const [en, nepali] of Object.entries(ne)) {
    assert.equal(ph(nepali), ph(en), `placeholders differ for "${en}"`);
  }
});

test("the app is wrapped in the language provider and has a visible switch", () => {
  assert.match(read("App.jsx"), /<LanguageProvider>/);
  assert.match(read("components/Navbar.jsx"), /<LanguageToggle \/>/);
});

test("Nepali text gets its own typography rules (no capitals or wide spacing, more line room)", () => {
  const css = read("index.css");
  assert.match(css, /html\[lang="ne"\] \.uppercase \{ text-transform: none; \}/);
  assert.match(css, /html\[lang="ne"\] \[class\*="tracking-"\] \{ letter-spacing: normal; \}/);
  assert.match(css, /html\[lang="ne"\] :is\(h1, h2, h3\) \{ line-height: 1\.35; \}/);
});

test("the language switch's accessible name is its visible text", () => {
  const src = read("components/LanguageToggle.jsx");
  assert.doesNotMatch(src, /aria-label/);
  assert.match(src, /title=\{/);
});
