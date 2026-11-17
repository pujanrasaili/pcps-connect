import { test } from "node:test";
import assert from "node:assert/strict";
import { clubMetaDescription, clubJsonLd } from "../src/utils/clubSeo.js";

const club = { _id: "a".repeat(24), name: "Coding Club", description: "Short.", longDescription: "We build things together every Friday.", image: "https://res.cloudinary.com/x/club.jpg" };

test("a club's search description prefers the long text, falls back, and stays short", () => {
  assert.equal(clubMetaDescription(club), "We build things together every Friday.");
  assert.equal(clubMetaDescription({ ...club, longDescription: "" }), "Short.");
  assert.match(clubMetaDescription({ name: "Chess Club" }), /^Chess Club — a student club/);
  const long = clubMetaDescription({ ...club, longDescription: "word ".repeat(100) });
  assert.ok(long.length <= 160 && long.endsWith("…"));
  assert.equal(clubMetaDescription(null), null);
});

test("club data names the club, links it to the college and keeps only real image links", () => {
  const data = clubJsonLd(club, "https://pcps-connect.vercel.app");
  assert.equal(data["@type"], "Organization");
  assert.equal(data.url, `https://pcps-connect.vercel.app/clubs?club=${club._id}`);
  assert.equal(data.parentOrganization["@id"], "https://pcps-connect.vercel.app/#organization");
  assert.equal(data.logo, club.image);
  assert.equal(clubJsonLd({ ...club, image: "/uploads/old.jpg" }, "https://x").logo, undefined);
  assert.equal(clubJsonLd({ name: "No id" }, "https://x"), null);
});
