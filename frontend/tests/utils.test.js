// Zero-dependency unit tests (Node's built-in runner) for the pure helpers the
// UI relies on. Run with `npm test`.
import test from "node:test";
import assert from "node:assert/strict";
import { csvField, buildCsv, slugify } from "../src/utils/csv.js";
import { pluralize } from "../src/utils/plural.js";
import { buildIcs, buildIcsCalendar, googleCalendarUrl } from "../src/utils/calendar.js";
import { titleForPath, eventTitle, DEFAULT_TITLE } from "../src/utils/pageTitle.js";
import { isUpcoming, isPastEvent, relativeDay } from "../src/utils/formatDate.js";
import { queueLabel } from "../src/utils/waitlistLabel.js";
import { shouldAutoplayVideo } from "../src/utils/videoPolicy.js";
import { actionLabel, actionTone, actionGroup } from "../src/utils/auditLabels.js";
import { hasOpenSpots, readEventFilters, withEventFilters } from "../src/utils/eventFilters.js";
import { relatedEvents } from "../src/utils/relatedEvents.js";
import { createSlowTracker } from "../src/utils/slowRequests.js";
import { buildMonthGrid, dayKey, shiftMonth } from "../src/utils/monthGrid.js";
import { clubLink } from "../src/utils/share.js";
import { gettingStartedSteps, pendingGettingStarted } from "../src/utils/gettingStarted.js";
import { installMode, detectIos } from "../src/utils/installApp.js";
import { eventReport, reportText } from "../src/utils/eventReport.js";
import { localInputToIso, isoToLocalInput } from "../src/utils/dateTimeInput.js";
import { isRegistrationClosed, hasOpenDeadline, deadlineSoonLabel } from "../src/utils/registrationDeadline.js";
import { addScan, sessionCounts } from "../src/utils/checkInLog.js";
import { buildSheetHtml, sheetRows } from "../src/utils/attendanceSheet.js";
import { feedUrl, webcalUrl, googleSubscribeUrl, isPublicUrl } from "../src/utils/calendarFeed.js";
import { searchSite } from "../src/utils/siteSearch.js";
import { HELP_TOPICS } from "../src/utils/helpTopics.js";
import { errorText } from "../src/utils/errorText.js";
import { isSessionExpired } from "../src/utils/sessionExpiry.js";
import { buildMilestones } from "../src/utils/milestones.js";
import { TICKETS_KEY, readTickets, writeTickets, clearTickets, visibleTickets, planTicketSync, toTicket, ticketUrl } from "../src/utils/offlineTickets.js";
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

test("queueLabel words a waitlist position", () => {
  assert.equal(queueLabel(1), "Next in line");
  assert.equal(queueLabel(2), "2nd in line");
  assert.equal(queueLabel(3), "3rd in line");
  assert.equal(queueLabel(4), "4th in line");
  assert.equal(queueLabel(11), "11th in line");
  assert.equal(queueLabel(12), "12th in line");
  assert.equal(queueLabel(21), "21st in line");
  assert.equal(queueLabel(112), "112th in line");
  assert.equal(queueLabel(undefined), "On the waitlist");
  assert.equal(queueLabel(0), "On the waitlist");
});

test("errorText prefers the server's own message", () => {
  assert.equal(errorText({ response: { status: 400, data: { message: "Title can't be empty" } } }), "Title can't be empty");
});

test("errorText explains network failures and a sleeping server in plain words", () => {
  assert.match(errorText({ code: "ERR_NETWORK", message: "Network Error" }), /internet connection/);
  assert.match(errorText({ code: "ECONNABORTED", message: "timeout of 5000ms exceeded" }), /too long/);
  for (const status of [502, 503, 504]) {
    assert.match(errorText({ message: "Request failed", response: { status, data: "<html>" } }), /waking up/);
  }
  assert.match(errorText({ response: { status: 429, data: {} } }), /Too many attempts/);
});

test("errorText never shows raw axios text; it uses the fallback instead", () => {
  const err = { message: "Request failed with status code 400", response: { status: 400, data: {} } };
  assert.equal(errorText(err, "Failed to save event"), "Failed to save event");
  assert.equal(errorText(undefined), "Something went wrong. Please try again.");
});

test("isSessionExpired fires for a 401 on a normal request only", () => {
  const e = (status, url) => ({ response: { status }, config: { url } });
  assert.equal(isSessionExpired(e(401, "/registrations/my")), true);
  assert.equal(isSessionExpired(e(401, "/admin/users")), true);
  // Expected for a visitor who simply isn't logged in:
  assert.equal(isSessionExpired(e(401, "/auth/me")), false);
  assert.equal(isSessionExpired(e(401, "/auth/login")), false);
  assert.equal(isSessionExpired(e(401, "/auth/logout")), false);
  // Other failures are not a session problem:
  assert.equal(isSessionExpired(e(403, "/admin/users")), false);
  assert.equal(isSessionExpired(e(500, "/events")), false);
  assert.equal(isSessionExpired(undefined), false);
});

test("buildMilestones starts with nothing earned and shows progress", () => {
  const list = buildMilestones([], 0);
  assert.equal(list.length, 6);
  assert.ok(list.every((m) => !m.earned && m.current === 0));
});

test("buildMilestones counts attended events, joined clubs and ratings", () => {
  const regs = [
    { attended: true, rating: 5 },
    { attended: true },
    { attended: false, rating: 4 }, // rating without attending doesn't count
    null,
  ];
  const byId = Object.fromEntries(buildMilestones(regs, 3).map((m) => [m.id, m]));
  assert.equal(byId["first-event"].earned, true);
  assert.equal(byId["regular"].earned, false);
  assert.equal(byId["regular"].current, 2);
  assert.equal(byId["club-member"].earned, true);
  assert.equal(byId["connector"].earned, true);
  assert.equal(byId["critic"].earned, true);
});

test("buildMilestones never reports progress beyond the target", () => {
  const regs = Array.from({ length: 12 }, () => ({ attended: true }));
  const byId = Object.fromEntries(buildMilestones(regs, 0).map((m) => [m.id, m]));
  assert.equal(byId["campus-star"].current, 10);
  assert.equal(byId["campus-star"].earned, true);
});

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    data,
  };
}
const HOUR = 3600e3;
const reg = (id, hoursFromNow, extra = {}) => ({
  _id: id,
  status: "confirmed",
  event: { _id: "ev" + id, title: "Event " + id, date: new Date(Date.now() + hoursFromNow * HOUR).toISOString(), location: "Hall" },
  ...extra,
});

test("offline tickets round-trip through storage and survive garbage", () => {
  const s = fakeStorage();
  assert.deepEqual(readTickets(s), []);
  const t = toTicket(reg("r1", 5), "abc.def");
  writeTickets(s, [t]);
  assert.deepEqual(readTickets(s), [t]);
  clearTickets(s);
  assert.deepEqual(readTickets(s), []);
  assert.deepEqual(readTickets(fakeStorage({ [TICKETS_KEY]: "{not json" })), []);
  assert.deepEqual(readTickets(fakeStorage({ [TICKETS_KEY]: JSON.stringify([{ id: 1 }, null, t]) })), [t]);
  assert.deepEqual(readTickets(null), []);
});

test("visibleTickets hides tickets for events that ended long ago and sorts soonest first", () => {
  const now = Date.now();
  const mk = (id, h) => toTicket(reg(id, h), "c" + id);
  const list = visibleTickets([mk("late", 30), mk("soon", 2), mk("old", -20), mk("justEnded", -3)], now);
  assert.deepEqual(list.map((t) => t.id), ["justEnded", "soon", "late"]);
});

test("planTicketSync fetches only what is missing, drops cancelled ones, skips pending requests", () => {
  const stored = [toTicket(reg("keep", 5), "code-keep"), toTicket(reg("cancelled", 6), "code-x")];
  const regs = [reg("keep", 5), reg("fresh", 8), reg("pend", 9, { status: "pending" }), reg("past", -40)];
  const { keep, need } = planTicketSync(regs, stored);
  assert.deepEqual(keep.map((t) => t.id), ["keep"]);
  assert.equal(keep[0].code, "code-keep");
  assert.deepEqual(need.map((r) => r._id), ["fresh"]);
});

test("planTicketSync refreshes the event details on a ticket it already holds", () => {
  const stored = [toTicket(reg("r1", 5), "code")];
  const changed = reg("r1", 5);
  changed.event.location = "New Lab";
  const { keep } = planTicketSync([changed], stored);
  assert.equal(keep[0].location, "New Lab");
  assert.equal(keep[0].code, "code");
});

test("ticketUrl builds the same check-in link the QR modal uses", () => {
  assert.equal(ticketUrl("https://pcps-connect.vercel.app", "a.b"), "https://pcps-connect.vercel.app/admin/check-in?code=a.b");
});

test("club news actions have readable labels in the activity log", () => {
  assert.equal(actionLabel("club.post"), "Club news posted");
  assert.equal(actionLabel("club.postDeleted"), "Club news deleted");
  assert.equal(actionTone("club.postDeleted"), "danger");
  assert.equal(actionGroup("club.post"), "club");
});

test("event question actions have readable labels in the activity log", () => {
  assert.equal(actionLabel("event.questionAnswered"), "Event question answered");
  assert.equal(actionLabel("event.questionDeleted"), "Event question deleted");
  assert.equal(actionTone("event.questionDeleted"), "danger");
  assert.equal(actionGroup("event.questionAnswered"), "event");
});

test("walk-in actions have a readable label in the activity log", () => {
  assert.equal(actionLabel("event.walkIn"), "Walk-in added");
  assert.equal(actionTone("event.walkIn"), "info");
});

test("installMode offers the right install help", () => {
  assert.equal(installMode({ canPrompt: true, isStandalone: false, isIos: false }), "prompt");
  assert.equal(installMode({ canPrompt: false, isStandalone: false, isIos: true }), "ios-steps");
  assert.equal(installMode({ canPrompt: false, isStandalone: false, isIos: false }), "hidden");
  assert.equal(installMode({ canPrompt: true, isStandalone: true, isIos: false }), "hidden");
  assert.equal(installMode({ canPrompt: false, isStandalone: true, isIos: true }), "hidden");
});

test("detectIos recognises iPhones and touch iPads but not Macs", () => {
  assert.equal(detectIos("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", 5), true);
  assert.equal(detectIos("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5), true);
  assert.equal(detectIos("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0), false);
  assert.equal(detectIos("Mozilla/5.0 (Linux; Android 14)", 5), false);
});

test("eventReport counts attendance and ratings, ignoring pending requests", () => {
  const regs = [
    { status: "confirmed", attended: true, rating: 5, feedback: "Great" },
    { status: "confirmed", attended: true, rating: 4, feedback: " " },
    { status: "confirmed", attended: false },
    { status: "pending", attended: false, rating: 1 },
  ];
  const r = eventReport(regs, 2);
  assert.equal(r.registered, 3);
  assert.equal(r.attended, 2);
  assert.equal(r.noShows, 1);
  assert.equal(r.attendanceRate, 67);
  assert.equal(r.averageRating, 4.5);
  assert.equal(r.ratingCount, 2);
  assert.equal(r.comments, 1);
  assert.equal(r.waitlist, 2);
  assert.deepEqual(r.distribution.find((d) => d.stars === 5), { stars: 5, count: 1 });
});

test("eventReport handles an empty event and reportText stays readable", () => {
  const r = eventReport([], 0);
  assert.equal(r.attendanceRate, null);
  assert.equal(r.averageRating, null);
  const text = reportText("Hack Night", eventReport([{ status: "confirmed", attended: true, rating: 5 }]));
  assert.match(text, /Hack Night -- event summary/);
  assert.match(text, /Attended: 1 \(100%\)/);
  assert.match(text, /Rating: 5\/5 from 1 rating$/);
});

test("form times are sent as exact instants and read back unchanged", () => {
  assert.equal(localInputToIso(""), "");
  const iso = localInputToIso("2026-12-30T10:00");
  assert.match(iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/);
  assert.equal(new Date(iso).getHours(), 10); // the organiser's own 10:00, whatever zone this runs in
  assert.equal(isoToLocalInput(iso), "2026-12-30T10:00");
  assert.equal(isoToLocalInput(null), "");
  assert.equal(isoToLocalInput("nonsense"), "");
});

test("registration closes only after the optional deadline", () => {
  const now = new Date("2030-06-01T00:00:00Z");
  assert.equal(isRegistrationClosed({}, now), false);
  assert.equal(isRegistrationClosed({ registrationDeadline: null }, now), false);
  assert.equal(isRegistrationClosed({ registrationDeadline: "2030-06-02T00:00:00Z" }, now), false);
  assert.equal(isRegistrationClosed({ registrationDeadline: "2030-05-31T00:00:00Z" }, now), true);
  assert.equal(hasOpenDeadline({ registrationDeadline: "2030-06-02T00:00:00Z" }, now), true);
  assert.equal(hasOpenDeadline({ registrationDeadline: "2030-05-31T00:00:00Z" }, now), false);
  assert.equal(hasOpenDeadline({}, now), false);
});

test("check-in log lists newest first and counts each student once", () => {
  const scan = (name, already = false) => ({ alreadyCheckedIn: already, student: { name, studentId: "" }, event: { title: "Hack Night" } });
  let log = addScan([], scan("Sita"), new Date("2030-01-01T10:00:00Z"));
  log = addScan(log, scan("Hari"), new Date("2030-01-01T10:01:00Z"));
  assert.deepEqual(log.map((e) => e.name), ["Hari", "Sita"]);
  // Sita's code scanned again: moves to the top, still one entry, still counted as checked in.
  log = addScan(log, scan("Sita", true), new Date("2030-01-01T10:02:00Z"));
  assert.deepEqual(log.map((e) => e.name), ["Sita", "Hari"]);
  assert.deepEqual(sessionCounts(log), { checkedIn: 2, repeats: 0 });
});

test("check-in log separates people who were already checked in before this session", () => {
  const log = addScan([], { alreadyCheckedIn: true, student: { name: "Ram", studentId: "P9" }, event: { title: "E" } });
  assert.deepEqual(sessionCounts(log), { checkedIn: 0, repeats: 1 });
  assert.deepEqual(addScan(log, null), log);
  let many = [];
  for (let i = 0; i < 60; i++) many = addScan(many, { alreadyCheckedIn: false, student: { name: "S" + i }, event: { title: "E" } });
  assert.equal(many.length, 50);
});

test("sign-in sheet lists confirmed students alphabetically and escapes their text", () => {
  const regs = [
    { status: "confirmed", attended: false, user: { name: "Zara", studentId: "P2" } },
    { status: "pending", user: { name: "Pending Person" } },
    { status: "confirmed", attended: true, user: { name: "<b>Amit</b> & Co", studentId: "P1" } },
  ];
  assert.deepEqual(sheetRows(regs).map((r) => r.name), ["<b>Amit</b> & Co", "Zara"]);
  const html = buildSheetHtml({ title: 'Hack "Night"' }, regs, "Mon, Jan 1");
  assert.match(html, /&lt;b&gt;Amit&lt;\/b&gt; &amp; Co/);
  assert.ok(!html.includes("<b>Amit"));
  assert.ok(!html.includes("Pending Person"));
  assert.match(html, /2 registered/);
  assert.match(html, /Hack &quot;Night&quot; - sign-in sheet/);
});

test("an event past its registration deadline doesn't count as having open spots", () => {
  assert.equal(hasOpenSpots({ capacity: 10, registeredCount: 1 }), true);
  assert.equal(hasOpenSpots({ capacity: 10, registeredCount: 1, registrationDeadline: new Date(Date.now() + 86400000).toISOString() }), true);
  assert.equal(hasOpenSpots({ capacity: 10, registeredCount: 1, registrationDeadline: new Date(Date.now() - 1000).toISOString() }), false);
});

test("deadlineSoonLabel only nudges when the deadline is within three days", () => {
  const now = new Date("2030-06-01T00:00:00Z");
  const at = (h) => ({ registrationDeadline: new Date(now.getTime() + h * 3600000).toISOString() });
  assert.equal(deadlineSoonLabel({}, now), null);
  assert.equal(deadlineSoonLabel(at(-1), now), null);
  assert.equal(deadlineSoonLabel(at(100), now), null);
  assert.equal(deadlineSoonLabel(at(0.5), now), "Registration closes within the hour");
  assert.equal(deadlineSoonLabel(at(5), now), "Registration closes in 5 hours");
  assert.equal(deadlineSoonLabel(at(24), now), "Registration closes in 1 day");
  assert.equal(deadlineSoonLabel(at(49), now), "Registration closes in 3 days");
});

test("calendar feed links point at the API feed, for everyone or one club", () => {
  assert.equal(feedUrl("https://api.test/api/"), "https://api.test/api/events/calendar.ics");
  assert.equal(feedUrl("https://api.test/api", "abc123"), "https://api.test/api/events/calendar.ics?club=abc123");
  assert.equal(webcalUrl("https://api.test/api/events/calendar.ics"), "webcal://api.test/api/events/calendar.ics");
  assert.equal(
    googleSubscribeUrl("https://api.test/api/events/calendar.ics"),
    "https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2Fapi.test%2Fapi%2Fevents%2Fcalendar.ics"
  );
});

test("only a public address can be subscribed to from Google", () => {
  assert.equal(isPublicUrl("https://pcps-connect-backend.onrender.com/api/events/calendar.ics"), true);
  assert.equal(isPublicUrl("http://localhost:5000/api/events/calendar.ics"), false);
  assert.equal(isPublicUrl("not a url"), false);
});

import { formatTime, formatDateAndTime } from "../src/utils/formatDate.js";

test("formatTime and formatDateAndTime show the start time", () => {
  const d = new Date(2026, 11, 5, 10, 0); // local 10:00, whatever the machine's zone
  assert.equal(formatTime(d), "10:00 AM");
  assert.equal(formatDateAndTime(d), "Sat, Dec 5, 2026 · 10:00 AM");
  assert.equal(formatTime(new Date(2026, 11, 5, 15, 45)), "3:45 PM");
});

test("attendanceCsv lists one row per past event and protects formulas", async () => {
  const { attendanceCsv } = await import("../src/utils/attendanceCsv.js");
  const csv = attendanceCsv({
    events: [
      { title: "=SUM(1)", club: "Tech", date: "2026-10-01T00:00:00Z", registered: 4, attended: 3, noShows: 1, attendanceRate: 75, averageRating: 4.5, ratingCount: 2 },
      { title: "Quiet", club: "", date: "2026-09-01T00:00:00Z", registered: 0, attended: 0, noShows: 0, attendanceRate: null, averageRating: null, ratingCount: 0 },
    ],
  });
  const lines = csv.split("\r\n");
  assert.equal(lines.length, 3);
  assert.match(lines[1], /^"'=SUM\(1\)","Tech","2026-10-01","4","3","1","75","4.5","2"$/);
  assert.match(lines[2], /"Quiet","","2026-09-01","0","0","0","","",/);
  assert.equal(attendanceCsv(null).split("\r\n").length, 1);
});

test("isThisWeek covers today through six days ahead, never the past", async () => {
  const { isThisWeek, readEventFilters } = await import("../src/utils/eventFilters.js");
  const now = new Date(2026, 9, 30, 10, 0); // Fri 30 Oct, 10:00 local
  assert.equal(isThisWeek(new Date(2026, 9, 30, 18, 0), now), true); // later today
  assert.equal(isThisWeek(new Date(2026, 10, 5, 23, 59), now), true); // 6 days ahead, last minute
  assert.equal(isThisWeek(new Date(2026, 10, 6, 0, 0), now), false); // 7 days ahead
  assert.equal(isThisWeek(new Date(2026, 9, 30, 9, 0), now), false); // already started
  assert.equal(isThisWeek("banana", now), false);
  assert.equal(readEventFilters(new URLSearchParams("when=week")).when, "week");
});

test("time ranges: same day, later day, and an end that doesn't count", async () => {
  const { formatTimeRange, formatDateTimeRange } = await import("../src/utils/formatDate.js");
  const start = new Date(2026, 11, 5, 10, 0);
  assert.match(formatTimeRange(start, new Date(2026, 11, 5, 12, 0)), /^10:00\s?AM\s–\s12:00\s?PM$/);
  assert.match(formatTimeRange(start, new Date(2026, 11, 6, 12, 0)), /^10:00\s?AM\s–\sSun, Dec 6, 12:00\s?PM$/);
  for (const end of [undefined, null, "", "banana", start, new Date(2026, 11, 5, 9, 0)]) {
    assert.match(formatTimeRange(start, end), /^10:00\s?AM$/);
  }
  assert.match(formatDateTimeRange(start, new Date(2026, 11, 5, 12, 0)), /Sat, Dec 5, 2026, 10:00\s?AM – 12:00\s?PM$/);
  assert.equal(formatDateTimeRange(start, null), formatDateTimeRange(start));
});

test("calendar links use the event's end time, else two hours", async () => {
  const { googleCalendarUrl, buildIcs } = await import("../src/utils/calendar.js");
  const event = { _id: "e1", title: "T", location: "L", description: "D", date: "2027-01-15T09:30:00.000Z" };
  const dates = (e) => new URL(googleCalendarUrl(e)).searchParams.get("dates");
  assert.equal(dates(event), "20270115T093000Z/20270115T113000Z");
  assert.equal(dates({ ...event, endDate: "2027-01-15T10:00:00.000Z" }), "20270115T093000Z/20270115T100000Z");
  assert.equal(dates({ ...event, endDate: "2027-01-15T09:00:00.000Z" }), "20270115T093000Z/20270115T113000Z");
  assert.match(buildIcs({ ...event, endDate: "2027-01-15T10:00:00.000Z" }), /DTEND:20270115T100000Z/);
});

test("timeAgo gives short relative times, then a date", async () => {
  const { timeAgo } = await import("../src/utils/timeAgo.js");
  const now = new Date("2026-10-31T12:00:00Z");
  const ago = (ms) => new Date(now.getTime() - ms).toISOString();
  assert.equal(timeAgo(ago(20 * 1000), now), "just now");
  assert.equal(timeAgo(ago(5 * 60 * 1000), now), "5 min ago");
  assert.equal(timeAgo(ago(3 * 3600 * 1000), now), "3 h ago");
  assert.equal(timeAgo(ago(2 * 86400 * 1000), now), "2 d ago");
  assert.match(timeAgo(ago(30 * 86400 * 1000), now), /Oct 1/);
  assert.equal(timeAgo("banana", now), "");
  assert.equal(timeAgo(new Date(now.getTime() + 60000).toISOString(), now), "just now"); // clock skew
});

import { sharedRequest, clearSharedRequests } from "../src/utils/sharedRequest.js";

test("sharedRequest: callers at the same moment share one request, later ones ask again, failures are not kept", async () => {
  clearSharedRequests();
  let calls = 0;
  const load = async () => { calls += 1; return calls; };
  let t = 1000;
  const now = () => t;
  const [a, b] = await Promise.all([sharedRequest("k", load, 3000, now), sharedRequest("k", load, 3000, now)]);
  assert.equal(calls, 1);
  assert.equal(a, b);
  t += 5000; // after the window
  assert.equal(await sharedRequest("k", load, 3000, now), 2);
  assert.equal(await sharedRequest("other", load, 3000, now), 3); // different key

  let fails = 0;
  const bad = async () => { fails += 1; throw new Error("down"); };
  await assert.rejects(sharedRequest("bad", bad, 3000, now));
  await assert.rejects(sharedRequest("bad", bad, 3000, now));
  assert.equal(fails, 2);
  clearSharedRequests();
});
