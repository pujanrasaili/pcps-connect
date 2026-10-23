// Zero-dependency unit tests (Node's built-in runner) for the pure helpers the
// UI relies on. Run with `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import { csvField, buildCsv, slugify } from "../src/utils/csv.js";
import { pluralize } from "../src/utils/plural.js";
import { buildIcs, buildIcsCalendar, googleCalendarUrl } from "../src/utils/calendar.js";
import { titleForPath, eventTitle, DEFAULT_TITLE } from "../src/utils/pageTitle.js";
import { isUpcoming, isPastEvent, relativeDay } from "../src/utils/formatDate.js";
import { shouldAutoplayVideo } from "../src/utils/videoPolicy.js";
import { actionLabel, actionTone, actionGroup } from "../src/utils/auditLabels.js";
import { hasOpenSpots, readEventFilters, withEventFilters } from "../src/utils/eventFilters.js";
import { relatedEvents } from "../src/utils/relatedEvents.js";
import { createSlowTracker } from "../src/utils/slowRequests.js";
import { buildMonthGrid, dayKey, shiftMonth } from "../src/utils/monthGrid.js";
import { clubLink } from "../src/utils/share.js";
import { gettingStartedSteps, pendingGettingStarted } from "../src/utils/gettingStarted.js";
import { searchSite } from "../src/utils/siteSearch.js";
import { HELP_TOPICS } from "../src/utils/helpTopics.js";
import { noticeId } from "../src/utils/siteNotice.js";
import { ADMIN_EVENT_TABS, countAdminEvents, filterAdminEvents } from "../src/utils/adminEventFilters.js";
import { filterClubs, sortClubs } from "../src/utils/clubFilters.js";
import { parseSaved, toggleSaved, savedUpcoming } from "../src/utils/savedEvents.js";
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

test("every event in a calendar file carries a day-before and an hour-before reminder", () => {
  const ics = buildIcsCalendar([event, { ...event, _id: "e2" }]);
  assert.equal(ics.match(/BEGIN:VALARM/g).length, 4);
  assert.equal(ics.match(/END:VALARM/g).length, 4);
  assert.equal(ics.match(/TRIGGER:-P1D/g).length, 2);
  assert.equal(ics.match(/TRIGGER:-PT1H/g).length, 2);
  // Each alarm sits inside its event, before END:VEVENT.
  for (const chunk of ics.split("BEGIN:VEVENT").slice(1)) assert.ok(chunk.indexOf("END:VALARM") < chunk.indexOf("END:VEVENT"));
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
  assert.equal(actionLabel("event.created"), "Event created");
  assert.equal(actionLabel("event.updated"), "Event edited");
  assert.equal(actionLabel("club.updated"), "Club edited");
  assert.equal(actionTone("event.updated"), "info");
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

test("event filters: defaults, hand-edited values and the logged-out 'mine' fallback", () => {
  const p = (q) => new URLSearchParams(q);
  assert.deepEqual(readEventFilters(p("")), { when: "upcoming", category: "All", query: "", openOnly: false, club: "", view: "list" });
  assert.equal(readEventFilters(p("when=past")).when, "past");
  assert.equal(readEventFilters(p("when=bogus")).when, "upcoming");
  assert.equal(readEventFilters(p("when=mine")).when, "upcoming"); // needs login
  assert.equal(readEventFilters(p("when=saved")).when, "saved"); // no login needed
  assert.equal(readEventFilters(p("when=mine"), { isAuthenticated: true }).when, "mine");
  assert.equal(readEventFilters(p("open=1&q=hack&category=Tech")).openOnly, true);
  assert.equal(readEventFilters(p("view=calendar")).view, "calendar");
  assert.equal(readEventFilters(p("view=nonsense")).view, "list");
});

test("withEventFilters drops defaults and keeps other params", () => {
  const base = new URLSearchParams("club=c1&when=past");
  assert.equal(withEventFilters(base, { when: "upcoming" }).toString(), "club=c1");
  assert.equal(withEventFilters(base, { category: "Tech", open: true }).toString(), "club=c1&when=past&category=Tech&open=1");
  assert.equal(withEventFilters(new URLSearchParams("open=1"), { open: false }).toString(), "");
  assert.equal(withEventFilters(new URLSearchParams(), { view: "calendar" }).toString(), "view=calendar");
  assert.equal(withEventFilters(new URLSearchParams("view=calendar"), { view: "list" }).toString(), "");
  assert.equal(withEventFilters(new URLSearchParams(), { q: "" }).toString(), "");
});

test("hasOpenSpots uses the card's default capacity of 100", () => {
  assert.equal(hasOpenSpots({ capacity: 10, registeredCount: 10 }), false);
  assert.equal(hasOpenSpots({ capacity: 10, registeredCount: 9 }), true);
  assert.equal(hasOpenSpots({ registeredCount: 99 }), true);
  assert.equal(hasOpenSpots({}), true);
});

test("slow tracker flags only requests that outlive the threshold, and clears when they finish", () => {
  let nextHandle = 0;
  const pending = new Map();
  const tracker = createSlowTracker({
    thresholdMs: 4000,
    setTimer: (fn) => { pending.set(++nextHandle, fn); return nextHandle; },
    clearTimer: (h) => pending.delete(h),
  });
  let notifications = 0;
  tracker.subscribe(() => { notifications += 1; });

  tracker.start("fast");
  tracker.end("fast"); // answered in time: timer cancelled, never slow
  assert.equal(pending.size, 0);
  assert.equal(tracker.isSlow(), false);
  assert.equal(notifications, 0);

  tracker.start("a");
  tracker.start("b");
  pending.get(2)(); // request "a" hits the threshold
  assert.equal(tracker.isSlow(), true);
  assert.equal(notifications, 1);

  tracker.end("a"); // the slow one finishes; "b" is still under the threshold
  assert.equal(tracker.isSlow(), false);
  assert.equal(notifications, 2);
  tracker.end("b");
  tracker.end("never-started"); // harmless
  assert.equal(notifications, 2);
});

test("buildIcsCalendar puts several events in one calendar, and a single event matches buildIcs", () => {
  const now = new Date("2026-10-01T00:00:00Z");
  const second = { ...event, _id: "e2", title: "Quiz Night" };
  const ics = buildIcsCalendar([event, second], now);
  assert.equal(ics.match(/BEGIN:VCALENDAR/g).length, 1);
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, 2);
  assert.match(ics, /UID:e1@pcps-connect/);
  assert.match(ics, /UID:e2@pcps-connect/);
  assert.equal(buildIcsCalendar([event], now), buildIcs(event, now));
  assert.equal(buildIcsCalendar([], now).includes("BEGIN:VEVENT"), false); // empty list: valid, empty calendar
});

test("buildMonthGrid lays out full Sunday-first weeks and files events under their local day", () => {
  // March 2027 starts on a Monday and has 31 days -> 5 weeks, first cell is Sun 28 Feb.
  const at = (d, h) => new Date(2027, 2, d, h).toISOString();
  const events = [
    { _id: "late", date: at(5, 18) },
    { _id: "early", date: at(5, 9) },
    { _id: "other", date: at(20, 12) },
    { _id: "next-month", date: new Date(2027, 3, 2, 9).toISOString() },
  ];
  const weeks = buildMonthGrid(2027, 2, events);
  assert.equal(weeks.length, 5);
  assert.ok(weeks.every((w) => w.length === 7));
  assert.equal(weeks[0][0].key, "2027-02-28");
  assert.equal(weeks[0][0].inMonth, false);
  assert.equal(weeks[0][1].key, "2027-03-01");
  assert.equal(weeks[0][1].inMonth, true);
  const cell = weeks.flat().find((c) => c.key === "2027-03-05");
  assert.deepEqual(cell.events.map((e) => e._id), ["early", "late"]); // earliest first
  assert.equal(weeks.flat().find((c) => c.key === "2027-03-20").events.length, 1);
  // April 2 falls in the trailing padding of March's last week, and still shows its event.
  assert.equal(weeks.flat().find((c) => c.key === "2027-04-02").events[0]._id, "next-month");
});

test("buildMonthGrid handles a month that fits in four weeks and one that needs six", () => {
  assert.equal(buildMonthGrid(2026, 1, []).length, 4); // Feb 2026: starts Sunday, 28 days
  assert.equal(buildMonthGrid(2026, 7, []).length, 6); // Aug 2026: starts Saturday, 31 days
});

test("shiftMonth rolls the year over in both directions", () => {
  assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftMonth(2027, 0, -1), { year: 2026, month: 11 });
  assert.deepEqual(shiftMonth(2026, 5, 0), { year: 2026, month: 5 });
  assert.equal(dayKey(new Date(2027, 0, 5, 23, 59)), "2027-01-05");
});

test("relatedEvents prefers the same club, then category, soonest first, skipping past and itself", () => {
  const future = (days) => new Date(Date.now() + days * 86400000).toISOString();
  const cur = { _id: "c", club: { _id: "A" }, category: "Tech", date: future(5) };
  const events = [
    cur,
    { _id: "past", club: { _id: "A" }, category: "Tech", date: future(-3) },
    { _id: "cat-soon", club: { _id: "B" }, category: "Tech", date: future(1) },
    { _id: "club-late", club: { _id: "A" }, category: "Arts", date: future(20) },
    { _id: "club-early", club: { _id: "A" }, category: "Arts", date: future(2) },
    { _id: "other", club: { _id: "B" }, category: "Arts", date: future(1) },
  ];
  assert.deepEqual(relatedEvents(events, cur).map((e) => e._id), ["club-early", "club-late", "cat-soon"]);
  assert.equal(relatedEvents(events, cur, 1).length, 1);
  assert.deepEqual(relatedEvents(events, null), []);
});

test("parseSaved survives missing, corrupted and odd storage", () => {
  assert.deepEqual(parseSaved(null), []);
  assert.deepEqual(parseSaved("{oops"), []);
  assert.deepEqual(parseSaved('{"a":1}'), []);
  assert.deepEqual(parseSaved('["a","b","a",3,"",null]'), ["a", "b"]);
  assert.equal(parseSaved(JSON.stringify(Array.from({ length: 500 }, (_, i) => `e${i}`))).length, 200);
});

test("toggleSaved adds newest first, removes on second tap, and never mutates", () => {
  const start = ["a", "b"];
  assert.deepEqual(toggleSaved(start, "c"), ["c", "a", "b"]);
  assert.deepEqual(toggleSaved(start, "a"), ["b"]);
  assert.deepEqual(start, ["a", "b"]);
});

test("savedUpcoming keeps saved, upcoming, not-yet-joined events, soonest first", () => {
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString();
  const events = [
    { _id: "late", date: day(9) },
    { _id: "soon", date: day(2) },
    { _id: "past", date: day(-2) },
    { _id: "joined", date: day(3) },
    { _id: "unsaved", date: day(1) },
  ];
  const ids = savedUpcoming(events, ["late", "soon", "past", "joined"], (id) => id === "joined").map((e) => e._id);
  assert.deepEqual(ids, ["soon", "late"]);
  assert.deepEqual(savedUpcoming(events, []), []);
});

test("filterClubs combines category, search and 'only my clubs'", () => {
  const clubs = [
    { _id: "a", name: "Coding Club", category: "Technology", description: "Weekly hacks" },
    { _id: "b", name: "Art Circle", category: "Arts", description: "Drawing and painting" },
    { _id: "c", name: "Robotics", category: "Technology" },
  ];
  const joined = (id) => id === "c";
  assert.equal(filterClubs(clubs).length, 3);
  assert.deepEqual(filterClubs(clubs, { category: "Technology" }).map((c) => c._id), ["a", "c"]);
  assert.deepEqual(filterClubs(clubs, { query: "PAINT" }).map((c) => c._id), ["b"]);
  assert.deepEqual(filterClubs(clubs, { mineOnly: true, isJoined: joined }).map((c) => c._id), ["c"]);
  assert.deepEqual(filterClubs(clubs, { mineOnly: true, category: "Arts", isJoined: joined }), []);
});

test("sortClubs orders by members or name without touching the original list", () => {
  const clubs = [
    { _id: "a", name: "Robotics", memberCount: 5 },
    { _id: "b", name: "Art", memberCount: 12 },
    { _id: "c", name: "Chess" },
    { _id: "d", name: "Band", memberCount: 5 },
  ];
  assert.deepEqual(sortClubs(clubs, "members").map((c) => c._id), ["b", "d", "a", "c"]);
  assert.deepEqual(sortClubs(clubs, "name").map((c) => c._id), ["b", "d", "c", "a"]);
  assert.equal(sortClubs(clubs, "default"), clubs);
  assert.equal(sortClubs(clubs, "bogus"), clubs);
  assert.deepEqual(clubs.map((c) => c._id), ["a", "b", "c", "d"]);
});

test("admin event tabs split upcoming, past and awaiting-decision, and counts match", () => {
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString();
  const events = [
    { _id: "a", title: "Hack Night", date: day(3), pendingCount: 2 },
    { _id: "b", title: "Old Workshop", date: day(-5) },
    { _id: "c", title: "Hack Day", date: day(-1), pendingCount: 0 },
  ];
  assert.deepEqual(filterAdminEvents(events, { tab: "upcoming" }).map((e) => e._id), ["a"]);
  assert.deepEqual(filterAdminEvents(events, { tab: "past" }).map((e) => e._id), ["b", "c"]);
  assert.deepEqual(filterAdminEvents(events, { tab: "pending" }).map((e) => e._id), ["a"]);
  assert.deepEqual(filterAdminEvents(events, { tab: "all", query: "HACK" }).map((e) => e._id), ["a", "c"]);
  assert.deepEqual(filterAdminEvents(events, { tab: "past", query: "hack" }).map((e) => e._id), ["c"]);
  assert.deepEqual(countAdminEvents(events), { all: 3, upcoming: 1, past: 2, pending: 1 });
  assert.deepEqual(ADMIN_EVENT_TABS.map(([v]) => v), ["all", "upcoming", "past", "pending"]);
});

test("noticeId changes when the announcement is edited, so a dismissed one comes back", () => {
  const a = { tone: "info", message: "Fest closes Friday", updatedAt: "2026-10-22T05:00:00Z" };
  assert.equal(noticeId(a), noticeId({ ...a }));
  assert.notEqual(noticeId(a), noticeId({ ...a, message: "Fest closes Saturday" }));
  assert.notEqual(noticeId(a), noticeId({ ...a, updatedAt: "2026-10-23T05:00:00Z" }));
  assert.equal(noticeId(null), "");
});

test("activity log words the announcement actions", () => {
  assert.equal(actionLabel("notice.set"), "Site announcement published");
  assert.equal(actionLabel("notice.cleared"), "Site announcement removed");
  assert.equal(actionTone("notice.set"), "info");
});

test("getting-started checklist ticks off steps and disappears once joining and registering are done", () => {
  const fresh = pendingGettingStarted({});
  assert.equal(fresh.done, 0);
  assert.equal(fresh.total, 3);
  assert.deepEqual(gettingStartedSteps({ joinedClubs: 2 }).map((s) => s.done), [true, false, false]);
  const partial = pendingGettingStarted({ joinedClubs: 1, favoriteClub: "c1" });
  assert.equal(partial.done, 2);
  assert.equal(partial.steps.find((s) => !s.done).id, "register");
  assert.equal(pendingGettingStarted({ joinedClubs: 1, favoriteClub: "c1", registrations: 1 }), null);
  // Picking a favourite is optional: it never keeps the card on screen.
  assert.equal(pendingGettingStarted({ joinedClubs: 1, registrations: 1 }), null);
});

test("help topics are complete, uniquely identified and the page has a title", () => {
  const ids = HELP_TOPICS.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const topic of HELP_TOPICS) {
    assert.match(topic.id, /^[a-z0-9-]+$/);
    assert.ok(topic.question.trim().endsWith("?") || topic.question.endsWith("."), topic.id);
    assert.ok(topic.answer.length > 0 && topic.answer.every((p) => p.trim().length > 0), topic.id);
  }
  assert.equal(titleForPath("/help"), "Help | PCPS Connect");
});

test("site search ranks name matches first, puts upcoming before past, and caps results", () => {
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString();
  const clubs = [
    { _id: "c1", name: "Photography Club", category: "Arts", description: "Weekly photo walks" },
    { _id: "c2", name: "Robotics", category: "Technology", description: "Build robots, photography of builds" },
    { _id: "c3", name: "Chess", category: "Games" },
  ];
  const events = [
    { _id: "e-old", title: "Photo Exhibition 2025", date: day(-30), club: { name: "Photography Club" } },
    { _id: "e-late", title: "Photo Walk", date: day(20), club: { name: "Photography Club" } },
    { _id: "e-soon", title: "Open Mic", date: day(2), club: { name: "Photography Club" }, location: "Photo Studio" },
    { _id: "e-none", title: "Chess Night", date: day(1), club: { name: "Chess" } },
  ];
  const r = searchSite(events, clubs, "  PHOTO ");
  assert.deepEqual(r.clubs.map((c) => c._id), ["c1", "c2"]); // name match before description mention
  assert.deepEqual(r.events.map((e) => e._id), ["e-late", "e-soon", "e-old"]); // upcoming first; name match beats place match
  assert.deepEqual(searchSite(events, clubs, "   "), { clubs: [], events: [] });
  assert.deepEqual(searchSite(events, clubs, "zzzz"), { clubs: [], events: [] });
  assert.equal(searchSite(events, clubs, "photo", 1).events.length, 1);
  assert.deepEqual(searchSite([], [], "x"), { clubs: [], events: [] });
});

test("shouldAutoplayVideo holds back the reel for data-saver, slow or reduced-motion visitors", () => {
  assert.equal(shouldAutoplayVideo(), true);
  assert.equal(shouldAutoplayVideo({ effectiveType: "4g" }), true);
  assert.equal(shouldAutoplayVideo({ saveData: true }), false);
  assert.equal(shouldAutoplayVideo({ reducedMotion: true }), false);
  for (const slow of ["slow-2g", "2g", "3g"]) assert.equal(shouldAutoplayVideo({ effectiveType: slow }), false);
});
