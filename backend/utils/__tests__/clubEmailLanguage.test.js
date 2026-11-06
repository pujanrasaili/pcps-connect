jest.mock("../../models/ClubMembership");
jest.mock("../sendEmail");
jest.mock("../inApp");

const ClubMembership = require("../../models/ClubMembership");
const sendEmail = require("../sendEmail");
const { notifyNewClubEvent, notifyClubAnnouncement } = require("../notifyClubMembers");
const { notifyStudentOfDecision } = require("../clubJoinNotices");
const { clubEmail } = require("../clubEmailText");
const { settingsLink } = require("../unsubscribe");

const DEVANAGARI = /[ऀ-ॿ]/;
const club = { _id: "c1", name: "Tech <Club>" };
const event = { title: "Hack Night", date: new Date("2026-11-10T04:55:00Z"), location: "Lab 3" };
const member = (email, language) => ({ user: { _id: email, name: "S", email, language } });

beforeEach(() => {
  sendEmail.mockReset();
  sendEmail.mockResolvedValue();
  ClubMembership.find.mockReturnValue({
    populate: jest.fn().mockResolvedValue([member("ne@x.com", "ne"), member("en@x.com", "en"), member("none@x.com")]),
  });
});
const sentTo = (to) => sendEmail.mock.calls.map((c) => c[0]).find((m) => m.to === to);

describe("club emails follow the student's language", () => {
  it("new club event", async () => {
    await notifyNewClubEvent(event, club);
    const ne = sentTo("ne@x.com");
    expect(ne.html).toMatch(DEVANAGARI);
    expect(ne.html).toContain('lang="ne"');
    expect(ne.html).toContain("Tech &lt;Club&gt;");
    expect(ne.html).toContain(">सेटिङ</a>");
    expect(ne.headers["List-Unsubscribe"]).toBeTruthy();
    expect(sentTo("en@x.com").subject).toBe("Tech <Club>: Hack Night");
    expect(sentTo("en@x.com").html).toContain(">Settings</a>");
    expect(sentTo("none@x.com").subject).toBe(sentTo("en@x.com").subject);
  });

  it("club message keeps the admin text escaped", async () => {
    await notifyClubAnnouncement(club, "Meet <b>now</b>\nLab");
    for (const [m] of sendEmail.mock.calls) expect(m.html).toContain("Meet &lt;b&gt;now&lt;/b&gt;<br>Lab");
    expect(sentTo("ne@x.com").subject).toMatch(DEVANAGARI);
    expect(sentTo("en@x.com").subject).toBe("Message from Tech <Club>");
  });

  it("join decision, with the club's note escaped", async () => {
    await notifyStudentOfDecision({ _id: "u", name: "Asha", email: "a@x.com", language: "ne" }, club, false, "Full <now>");
    const ne = sendEmail.mock.calls[0][0];
    expect(ne.subject).toMatch(DEVANAGARI);
    expect(ne.html).toContain("Full &lt;now&gt;");
    await notifyStudentOfDecision({ _id: "u", name: "Asha", email: "a@x.com" }, club, true);
    expect(sendEmail.mock.calls[1][0].subject).toBe("Welcome to Tech <Club>");
  });

  it("every English club template has a Nepali one", () => {
    const vars = { name: "N", club: "C", rawClub: "C", title: "T", rawTitle: "T", when: "W", where: "P", messageHtml: "M", reason: "R", settings: settingsLink() };
    for (const kind of ["approved", "declined", "newEvent", "message"]) {
      const ne = clubEmail(kind, "ne", vars);
      expect(ne.heading).toMatch(DEVANAGARI);
      expect(ne.bodyHtml).toMatch(DEVANAGARI);
      expect(clubEmail(kind, "en", vars).bodyHtml).not.toMatch(DEVANAGARI);
    }
  });
});
