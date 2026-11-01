const { buildReminders, renderReminder } = require("../requestReminders");

const now = new Date("2026-03-20T00:00:00Z");
const daysAgo = (n) => new Date(now.getTime() - n * 86400000);
const leader = { _id: "l1", name: "Lena", email: "l@x.np" };
const admin = { _id: "a1", name: "Adam", email: "a@x.np" };

describe("buildReminders", () => {
  it("only counts requests that have waited 5 days or more, and reports the longest wait", () => {
    const out = buildReminders({
      now,
      requests: [{ club: "c1", createdAt: daysAgo(9) }, { club: "c1", createdAt: daysAgo(5) }, { club: "c1", createdAt: daysAgo(2) }],
      clubs: [{ _id: "c1", name: "Chess", leaders: [leader] }],
    });
    expect(out).toHaveLength(1);
    expect(out[0].items).toEqual([{ club: "Chess", count: 2, days: 9 }]);
    expect(out[0].link).toBe("/admin/my-clubs");
  });

  it("sends nothing when nobody is overdue", () => {
    expect(buildReminders({ now, requests: [{ club: "c1", createdAt: daysAgo(1) }], clubs: [{ _id: "c1", name: "Chess", leaders: [leader] }] })).toEqual([]);
  });

  it("falls back to the admins for a club without leaders", () => {
    const out = buildReminders({ now, requests: [{ club: "c1", createdAt: daysAgo(7) }], clubs: [{ _id: "c1", name: "Chess", leaders: [] }], admins: [admin] });
    expect(out.map((o) => o.user._id)).toEqual(["a1"]);
    expect(out[0].link).toBe("/admin/clubs");
  });

  it("gives someone who leads two clubs one email, and skips people without an email", () => {
    const out = buildReminders({
      now,
      requests: [{ club: "c1", createdAt: daysAgo(6) }, { club: "c2", createdAt: daysAgo(8) }],
      clubs: [
        { _id: "c1", name: "Chess", leaders: [leader, { _id: "x", name: "No Mail" }] },
        { _id: "c2", name: "Art", leaders: [leader] },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].items.map((i) => i.club)).toEqual(["Chess", "Art"]);
  });
});

describe("renderReminder", () => {
  it("escapes names, pluralises the subject and links to the right page", () => {
    const { subject, html } = renderReminder(
      { user: { name: "Lena <b>" }, link: "/admin/my-clubs", items: [{ club: "Chess & <Go>", count: 1, days: 6 }, { club: "Art", count: 2, days: 9 }] },
      "https://site.example"
    );
    expect(subject).toBe("3 students are still waiting to join your club");
    expect(html).not.toContain("<b>");
    expect(html).toContain("Chess &amp; &lt;Go&gt;");
    expect(html).toContain("https://site.example/admin/my-clubs");
  });

  it("uses the singular for one student", () => {
    expect(renderReminder({ user: { name: "L" }, link: "/x", items: [{ club: "A", count: 1, days: 5 }] }, "o").subject).toBe("1 student is still waiting to join your club");
  });
});
