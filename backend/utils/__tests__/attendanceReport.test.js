const { buildAttendanceReport, percent } = require("../attendanceReport");

describe("percent", () => {
  it("rounds to a whole number", () => expect(percent(2, 3)).toBe(67));
  it("returns null when there is nothing to divide by", () => expect(percent(0, 0)).toBeNull());
});

describe("buildAttendanceReport", () => {
  const events = [
    { _id: "e1", title: "Hackathon", date: "2026-10-01" },
    { _id: "e2", title: "Quiet Talk", date: "2026-09-01" },
  ];

  it("computes per-event turnout, no-shows and rating", () => {
    const stats = [{ _id: "e1", registered: 10, attended: 8, ratingSum: 18, ratingCount: 4 }];
    const { events: rows } = buildAttendanceReport(events, stats);
    expect(rows[0]).toMatchObject({
      title: "Hackathon", registered: 10, attended: 8, noShows: 2, attendanceRate: 80, averageRating: 4.5, ratingCount: 4,
    });
  });

  it("keeps events with no registrations, with null rate and rating", () => {
    const { events: rows } = buildAttendanceReport(events, []);
    expect(rows[1]).toMatchObject({ registered: 0, attended: 0, noShows: 0, attendanceRate: null, averageRating: null });
  });

  it("totals across all events", () => {
    const stats = [
      { _id: "e1", registered: 10, attended: 8, ratingSum: 18, ratingCount: 4 },
      { _id: "e2", registered: 5, attended: 1, ratingSum: 2, ratingCount: 1 },
    ];
    const { totals } = buildAttendanceReport(events, stats);
    expect(totals).toMatchObject({ registered: 15, attended: 9, attendanceRate: 60, averageRating: 4, ratingCount: 5 });
  });

  it("returns empty totals when there are no past events", () => {
    const { events: rows, totals } = buildAttendanceReport([], []);
    expect(rows).toEqual([]);
    expect(totals).toMatchObject({ registered: 0, attendanceRate: null, averageRating: null });
  });
});
