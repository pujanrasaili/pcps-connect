const { buildPersonalData } = require("../personalData");

const NOW = new Date("2026-10-19T00:00:00Z");
const user = {
  name: "Sita", email: "s@patancollege.edu.np", studentId: "S-1", role: "user",
  password: "HASH", passwordChangedAt: new Date(), emailVerificationToken: "tok", resetToken: "tok2",
  favoriteClub: { name: "Tech Club" }, eventReminders: false, createdAt: "2026-01-01T00:00:00Z",
};

describe("buildPersonalData", () => {
  const data = buildPersonalData(
    {
      user,
      registrations: [
        { event: { title: "Hack", date: "2026-09-01T10:00:00Z" }, status: "confirmed", attended: true, rating: 5, feedback: "great", createdAt: "2026-08-01T00:00:00Z" },
        { event: null, status: "confirmed" }, // dangling reference is skipped
      ],
      waitlist: [{ event: { title: "Fest", date: "2027-01-01T10:00:00Z" }, createdAt: "2026-10-01T00:00:00Z" }],
      memberships: [{ club: { name: "Tech Club" }, createdAt: "2026-02-01T00:00:00Z" }, { club: null }],
      ledClubs: [{ name: "Tech Club" }],
    },
    NOW
  );

  it("includes the person's profile, registrations, waitlist, memberships and led clubs", () => {
    expect(data.exportedAt).toBe(NOW.toISOString());
    expect(data.profile).toMatchObject({ name: "Sita", studentId: "S-1", favoriteClub: "Tech Club" });
    expect(data.profile.emailNotifications).toEqual({ eventReminders: false, clubUpdates: true });
    expect(data.registrations).toEqual([
      expect.objectContaining({ event: "Hack", attended: true, rating: 5, feedback: "great" }),
    ]);
    expect(data.waitlist).toHaveLength(1);
    expect(data.clubMemberships).toEqual([{ club: "Tech Club", joinedAt: "2026-02-01T00:00:00.000Z" }]);
    expect(data.clubsYouLead).toEqual(["Tech Club"]);
  });

  it("never leaks credentials or internal tokens", () => {
    const text = JSON.stringify(data);
    for (const secret of ["HASH", "tok", "tok2", "password", "passwordChangedAt", "emailVerificationToken", "resetToken"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("copes with a bare user and no related records", () => {
    const d = buildPersonalData({ user: { name: "A", email: "a@x.com", role: "user" } }, NOW);
    expect(d.registrations).toEqual([]);
    expect(d.profile.favoriteClub).toBeNull();
    expect(d.profile.joined).toBeNull();
  });
});
