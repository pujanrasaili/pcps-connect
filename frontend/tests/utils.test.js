// Zero-dependency unit tests (Node's built-in runner) for the pure helpers the
// UI relies on. Run with `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import { csvField, buildCsv, slugify } from "../src/utils/csv.js";
import { pluralize } from "../src/utils/plural.js";
import { buildIcs, googleCalendarUrl } from "../src/utils/calendar.js";
import { titleForPath, eventTitle, DEFAULT_TITLE } from "../src/utils/pageTitle.js";
import { isUpcoming, isPastEvent, relativeDay } from "../src/utils/formatDate.js";
import { actionLabel, actionTone, actionGroup } from "../src/utils/auditLabels.js";
import { clubLink } from "../src/utils/share.js";
import { optimizeImageUrl } from "../src/utils/imageUrl.js";

test("csvField quotes values and doubles inner quotes", () => {
  assert.equal(csvField('Sita "S" Rai'), '"Sita ""S"" Rai"');
  assert.equal(csvField("a,b"), '"a,b"');
  assert.equal(csvField(null), '""');
  assert.equal(csvField(42), '"42"');
});

test("csvField neutralises spreadsheet formula injection", () => {
  for (const evil of ['=HYPERLINK("http://evil","x")', "+1+1", "-2+3", "@SUM(A1)", "\tcmd"]) {
    assert.ok(csvField(evil).startsWith(`"'`), `${evil} should be prefixed with an apostrophe`);
  }
  assert.equal(csvField("normal"), '"normal"');
});

test("buildCsv joins rows with CRLF and keeps the header first", () => {
  const csv = buildCsv(["Name", "Email"], [["A", "a@x.com"], ["B", "b@x.com"]]);
  assert.equal(csv, '"Name","Email"\r\n"A","a@x.com"\r\n"B","b@x.com"');
});

test("slugify makes safe file names", () => {
  assert.equal(slugify("Hack Night 2026!"), "hack-night-2026");
  assert.equal(slugify("   "), "export");
  assert.equal(slugify(undefined, "students"), "students");
});

test("pluralize", () => {
  assert.equal(pluralize(1, "event"), "1 event");
  assert.equal(pluralize(0, "event"), "0 events");
  assert.equal(pluralize(2, "person", "people"), "2 people");
});

const event = {
  _id: "e1",
  title: "Hack Night",
  location: "Lab 2, Block A",
  description: "Bring a laptop;\nsnacks, too",
  date: "2027-01-15T09:30:00Z",
};

test("buildIcs produces a valid, escaped single-event calendar", () => {
  const ics = buildIcs(event, new Date("2026-10-01T00:00:00Z"));
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.match(ics, /DTSTART:20270115T093000Z/);
  assert.match(ics, /DTEND:20270115T113000Z/); // fixed 2-hour default
  assert.match(ics, /LOCATION:Lab 2\\, Block A/);
  assert.match(ics, /DESCRIPTION:Bring a laptop\\;\\nsnacks\\, too/);
  assert.match(ics, /UID:e1@pcps-connect/);
});

test("buildIcs folds lines longer than 75 characters", () => {
  const ics = buildIcs({ ...event, description: "x".repeat(200) });
  for (const line of ics.split("\r\n")) assert.ok(line.length <= 75, `line too long: ${line.length}`);
});

test("googleCalendarUrl encodes the event", () => {
  const url = new URL(googleCalendarUrl(event));
  assert.equal(url.hostname, "calendar.google.com");
  assert.equal(url.searchParams.get("text"), "Hack Night");
  assert.equal(url.searchParams.get("dates"), "20270115T093000Z/20270115T113000Z");
});

test("titleForPath: known pages, home, trailing slash, unknown and data-driven routes", () => {
  assert.equal(titleForPath("/clubs"), "Clubs | PCPS Connect");
  assert.equal(titleForPath("/clubs/"), "Clubs | PCPS Connect");
  assert.equal(titleForPath("/"), DEFAULT_TITLE);
  assert.equal(titleForPath("/admin/my-clubs"), "My clubs | PCPS Connect");
  assert.equal(titleForPath("/nope"), "Page not found | PCPS Connect");
  assert.equal(titleForPath("/events/abc"), undefined); // the page sets its own
  assert.equal(titleForPath("/certificate/abc"), undefined);
  assert.equal(eventTitle("Hack Night"), "Hack Night | PCPS Connect");
  assert.equal(eventTitle(undefined), "Event | PCPS Connect");
});

test("isUpcoming / isPastEvent compare against the exact current time", () => {
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const hourAhead = new Date(Date.now() + 3600_000).toISOString();
  assert.equal(isPastEvent(hourAgo), true);
  assert.equal(isUpcoming(hourAgo), false);
  assert.equal(isUpcoming(hourAhead), true);
});

test("audit labels, tones and groups", () => {
  assert.equal(actionLabel("user.selfDeleted"), "Self-deleted account");
  assert.equal(actionLabel("club.leaders"), "Club leaders changed");
  assert.equal(actionLabel("thing.some_action"), "Thing some action"); // unknown -> readable fallback
  assert.equal(actionTone("user.selfDeleted"), "danger");
  assert.equal(actionTone("event.deleted"), "danger");
  assert.equal(actionTone("user.rejected"), "danger");
  assert.equal(actionTone("user.approved"), "good");
  assert.equal(actionTone("user.approved_bulk"), "good");
  assert.equal(actionTone("club.leaders"), "info");
  assert.equal(actionGroup("club.announcement"), "club");
});

test("optimizeImageUrl adds Cloudinary resizing only where it is safe", () => {
  const plain = "https://res.cloudinary.com/demo/image/upload/v1712345678/pcps-connect/events/a.jpg";
  assert.equal(
    optimizeImageUrl(plain, 800),
    "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_800,c_limit/v1712345678/pcps-connect/events/a.jpg"
  );
  // no version segment, single path piece
  assert.equal(
    optimizeImageUrl("https://res.cloudinary.com/demo/image/upload/sample.jpg", 400),
    "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_400,c_limit/sample.jpg"
  );
  // already transformed -> left alone
  const transformed = "https://res.cloudinary.com/demo/image/upload/w_300,c_fill/v1/a.jpg";
  assert.equal(optimizeImageUrl(transformed, 800), transformed);
  // other hosts, missing width, empty -> unchanged
  assert.equal(optimizeImageUrl("https://example.com/a.jpg", 800), "https://example.com/a.jpg");
  assert.equal(optimizeImageUrl(plain), plain);
  assert.equal(optimizeImageUrl(null, 800), null);
  assert.equal(optimizeImageUrl("http://res.cloudinary.com/demo/image/upload/v1/a.jpg", 800), "http://res.cloudinary.com/demo/image/upload/v1/a.jpg");
});

test("relativeDay labels the next week by calendar day, local time", () => {
  const now = new Date(2026, 9, 20, 23, 30); // 20 Oct, 11:30pm local
  const at = (y, m, d, h = 9) => new Date(y, m, d, h).toISOString();
  assert.equal(relativeDay(at(2026, 9, 20, 23), now), "Today");
  assert.equal(relativeDay(at(2026, 9, 21), now), "Tomorrow"); // 9am tomorrow, even though it's 11:30pm now
  assert.equal(relativeDay(at(2026, 9, 24), now), "In 4 days");
  assert.equal(relativeDay(at(2026, 9, 27), now), "In 7 days");
  assert.equal(relativeDay(at(2026, 9, 28), now), null); // beyond a week: just show the date
  assert.equal(relativeDay(at(2026, 9, 19), now), null); // past
});

test("clubLink builds a deep link that opens the club's details", () => {
  assert.equal(clubLink({ _id: "abc123" }, "https://pcps-connect.vercel.app"), "https://pcps-connect.vercel.app/clubs?club=abc123");
  assert.equal(clubLink({ _id: "a b" }, "https://x.test"), "https://x.test/clubs?club=a%20b");
});
