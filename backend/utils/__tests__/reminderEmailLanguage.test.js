const { renderDigest } = require("../weeklyDigest");
const { renderReminder } = require("../requestReminders");
const { eventReminderEmail } = require("../reminderEmailText");

const DEVANAGARI = /[ऀ-ॿ]/;
const ev = [{ _id: "e1", title: "Hack <Night>", club: { name: "Tech & Co" }, date: new Date("2026-11-10T04:55:00Z"), location: "Lab" }];

describe("digest", () => {
  it("is Nepali for ne and unchanged English otherwise", () => {
    const ne = renderDigest({ user: { name: "Sita", language: "ne" }, events: ev, more: 2 }, "https://s.x");
    expect(ne.subject).toMatch(DEVANAGARI);
    expect(ne.html).toContain('lang="ne"');
    expect(ne.html).toContain("नोभे");
    expect(ne.html).toContain(">सेटिङ</a>");
    expect(ne.html).toContain("Hack &lt;Night&gt;");
    const en = renderDigest({ user: { name: "Ram" }, events: ev, more: 0 }, "https://s.x");
    expect(en.subject).toBe("1 event this week from your clubs");
    expect(en.html).toContain(">Settings</a>");
    expect(en.html).not.toMatch(DEVANAGARI);
  });
});

describe("join request nudge", () => {
  it("is Nepali for a Nepali leader, with names escaped", () => {
    const item = { club: "Chess <Go>", count: 2, days: 6 };
    const ne = renderReminder({ user: { name: "L", language: "ne" }, link: "/admin/my-clubs", items: [item] }, "https://s.x");
    expect(ne.subject).toMatch(DEVANAGARI);
    expect(ne.html).toContain("Chess &lt;Go&gt;");
    expect(ne.html).toContain("https://s.x/admin/my-clubs");
    expect(renderReminder({ user: { name: "L" }, link: "/x", items: [item] }, "o").subject).toBe("2 students are still waiting to join your club");
  });
});

describe("event reminder", () => {
  it("has English and Nepali wording", () => {
    const v = { name: "N", title: "T", rawTitle: "T", when: "W", where: "P", settings: "S" };
    expect(eventReminderEmail("en", v).subject).toBe("Reminder: T is coming up");
    const ne = eventReminderEmail("ne", v);
    expect(ne.subject).toMatch(DEVANAGARI);
    expect(ne.bodyHtml).toMatch(DEVANAGARI);
    expect(ne.lang).toBe("ne");
  });
});
