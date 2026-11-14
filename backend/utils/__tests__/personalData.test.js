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
      notifications: [{ title: "Seat opened", read: true, createdAt: "2026-10-02T00:00:00Z", user: "u1" }],
    },
    NOW
  );

  it("includes the person's profile, registrations, waitlist, memberships and led clubs", () => {
    expect(data.exportedAt).toBe(NOW.toISOString());
    expect(data.profile).toMatchObject({ name: "Sita", studentId: "S-1", favoriteClub: "Tech Club" });
    expect(data.profile.emailNotifications).toEqual({ eventReminders: false, clubUpdates: true });
    expect(data.profile.interests).toEqual([]);
    expect(data.registrations).toEqual([
      expect.objectContaining({ event: "Hack", attended: true, rating: 5, feedback: "great" }),
    ]);
    expect(data.waitlist).toHaveLength(1);
    expect(data.clubMemberships).toEqual([{ club: "Tech Club", joinedAt: "2026-02-01T00:00:00.000Z" }]);
    expect(data.clubsYouLead).toEqual(["Tech Club"]);
    expect(data.notifications).toEqual([{ message: "Seat opened", read: true, receivedAt: "2026-10-02T00:00:00.000Z" }]);
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

  it("includes join requests, event questions and contact messages, skipping dangling references", () => {
    const d = buildPersonalData(
      {
        user,
        joinRequests: [{ club: { name: "Robotics" }, createdAt: "2026-10-03T00:00:00Z" }, { club: null }],
        questions: [{ event: { title: "Hack" }, question: "Q?", createdAt: "2026-10-04T00:00:00Z" }, { event: null, question: "gone" }],
        contactMessages: [{ message: "Hello", createdAt: "2026-10-05T00:00:00Z" }],
      },
      NOW
    );
    expect(d.clubJoinRequests).toEqual([{ club: "Robotics", requestedAt: "2026-10-03T00:00:00.000Z" }]);
    expect(d.eventQuestions).toEqual([{ event: "Hack", question: "Q?", answer: "", askedAt: "2026-10-04T00:00:00.000Z" }]);
    expect(d.contactMessages).toEqual([{ subject: "", message: "Hello", sentAt: "2026-10-05T00:00:00.000Z" }]);
  });

  it("returns empty lists when there is nothing", () => {
    const d = buildPersonalData({ user }, NOW);
    expect(d.clubJoinRequests).toEqual([]);
    expect(d.eventQuestions).toEqual([]);
    expect(d.contactMessages).toEqual([]);
  });

  it("lists volunteer roles, skipping events that no longer exist", () => {
    const out = buildPersonalData({
      user: { name: "S", email: "s@x" },
      volunteering: [
        { event: { title: "Fest", date: "2026-12-01T00:00:00Z", volunteerRoles: [{ _id: "r1", name: "Desk" }] }, role: "r1", createdAt: "2026-10-06T00:00:00Z" },
        { event: null, role: "r9" },
      ],
    });
    expect(out.volunteering).toEqual([{ event: "Fest", eventDate: "2026-12-01T00:00:00.000Z", role: "Desk", signedUpAt: "2026-10-06T00:00:00.000Z" }]);
  });
});
