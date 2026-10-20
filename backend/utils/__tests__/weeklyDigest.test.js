const { digestWindow, buildDigests, renderDigest, MAX_EVENTS } = require("../weeklyDigest");

const club = (id, name = `Club ${id}`) => ({ _id: id, name });
const ev = (id, clubId, day, extra = {}) => ({
  _id: id, title: `Event ${id}`, date: `2026-10-${String(day).padStart(2, "0")}T09:00:00Z`, location: "Hall",
  club: club(clubId), capacity: 50, registeredCount: 10, ...extra,
});
const member = (userId, clubId, extra = {}) => ({ user: { _id: userId, name: `User ${userId}`, email: `${userId}@x.com`, ...extra }, club: clubId });

describe("digestWindow", () => {
  it("covers exactly the next 7 days", () => {
    const now = new Date("2026-10-18T02:00:00Z");
    const { start, end } = digestWindow(now);
    expect(start).toBe(now);
    expect(end.toISOString()).toBe("2026-10-25T02:00:00.000Z");
  });
});

describe("buildDigests", () => {
  it("lists events from clubs the student joined, soonest first", () => {
    const out = buildDigests({ events: [ev("e2", "c1", 22), ev("e1", "c1", 20), ev("e3", "c2", 21)], memberships: [member("u1", "c1")], registrations: [] });
    expect(out).toHaveLength(1);
    expect(out[0].events.map((e) => e._id)).toEqual(["e1", "e2"]);
    expect(out[0].more).toBe(0);
  });

  it("skips events the student already registered for, and full events", () => {
    const events = [ev("e1", "c1", 20), ev("e2", "c1", 21, { capacity: 10, registeredCount: 10 }), ev("e3", "c1", 22)];
    const out = buildDigests({ events, memberships: [member("u1", "c1")], registrations: [{ user: "u1", event: "e1" }] });
    expect(out[0].events.map((e) => e._id)).toEqual(["e3"]);
  });

  it("sends nothing to students with nothing new, opted out, or no email", () => {
    const events = [ev("e1", "c1", 20)];
    const out = buildDigests({
      events,
      memberships: [
        member("done", "c1"),
        member("off", "c1", { clubUpdates: false }),
        member("noemail", "c1", { email: "" }),
        member("other", "c9"),
        { user: null, club: "c1" },
      ],
      registrations: [{ user: "done", event: "e1" }],
    });
    expect(out).toEqual([]);
  });

  it("merges several clubs into one digest per student", () => {
    const out = buildDigests({
      events: [ev("e1", "c1", 20), ev("e2", "c2", 21)],
      memberships: [member("u1", "c1"), member("u1", "c2")],
      registrations: [],
    });
    expect(out).toHaveLength(1);
    expect(out[0].events).toHaveLength(2);
  });

  it("caps the list and reports how many were left out", () => {
    const events = Array.from({ length: MAX_EVENTS + 3 }, (_, i) => ev(`e${i}`, "c1", 20 + (i % 5)));
    const out = buildDigests({ events, memberships: [member("u1", "c1")], registrations: [] });
    expect(out[0].events).toHaveLength(MAX_EVENTS);
    expect(out[0].more).toBe(3);
  });

  it("treats a missing capacity as the default 100 seats", () => {
    const e = ev("e1", "c1", 20, { capacity: undefined, registeredCount: 99 });
    expect(buildDigests({ events: [e], memberships: [member("u1", "c1")], registrations: [] })).toHaveLength(1);
  });
});

describe("renderDigest", () => {
  const user = { _id: "u1", name: "Sita <b>" };

  it("builds a subject with the total count and links each event", () => {
    const { subject, html } = renderDigest({ user, events: [ev("e1", "c1", 20), ev("e2", "c1", 21)], more: 3 }, "https://site.test");
    expect(subject).toBe("5 events this week from your clubs");
    expect(html).toContain("https://site.test/events/e1");
    expect(html).toContain("...and 3 more");
  });

  it("uses the singular subject for one event", () => {
    expect(renderDigest({ user, events: [ev("e1", "c1", 20)], more: 0 }, "https://site.test").subject).toBe("1 event this week from your clubs");
  });

  it("escapes names and titles", () => {
    const { html } = renderDigest({ user, events: [ev("e1", "c1", 20, { title: "<script>x</script>" })], more: 0 }, "https://site.test");
    expect(html).not.toContain("<script>x</script>");
    expect(html).not.toContain("Sita <b>");
  });
});
