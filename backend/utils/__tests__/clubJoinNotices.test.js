jest.mock("../../models/Club");
jest.mock("../../models/User");
jest.mock("../sendEmail");
jest.mock("../inApp");

const Club = require("../../models/Club");
const User = require("../../models/User");
const sendEmail = require("../sendEmail");
const { pushNotifications } = require("../inApp");
const { notifyClubStaffOfRequest, notifyStudentOfDecision } = require("../clubJoinNotices");

afterEach(() => jest.resetAllMocks());

describe("notifyClubStaffOfRequest", () => {
  it("tells the leaders (My clubs) and the other admins (Clubs), without telling a leader-admin twice", async () => {
    Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ leaders: ["l1", "a2"] }) });
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: "a1" }, { _id: "a2" }]) });
    pushNotifications.mockResolvedValue(1);
    await notifyClubStaffOfRequest({ _id: "c1", name: "Chess" }, { name: "Asha" });
    const calls = pushNotifications.mock.calls;
    expect(calls[0][0]).toEqual(["l1", "a2"]);
    expect(calls[0][1]).toMatchObject({ type: "club_join_request", link: "/admin/my-clubs", title: "Asha asked to join Chess" });
    expect(calls[1][0]).toEqual(["a1"]);
    expect(calls[1][1].link).toBe("/admin/clubs");
  });

  it("never throws", async () => {
    Club.findById.mockImplementation(() => { throw new Error("db"); });
    jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(notifyClubStaffOfRequest({ _id: "c1", name: "Chess" }, { name: "Asha" })).resolves.toBe(0);
  });
});

describe("notifyStudentOfDecision", () => {
  const student = { _id: "s1", name: "Asha <b>", email: "a@x.np" };

  it("approved: bell message plus a welcome email, with the name escaped", async () => {
    sendEmail.mockResolvedValue();
    await notifyStudentOfDecision(student, { name: "Chess" }, true);
    expect(pushNotifications).toHaveBeenCalledWith(["s1"], expect.objectContaining({ type: "club_join_approved", link: "/clubs" }));
    const mail = sendEmail.mock.calls[0][0];
    expect(mail.to).toBe("a@x.np");
    expect(mail.subject).toBe("Welcome to Chess");
    expect(mail.html).not.toContain("<b>");
  });

  it("declined with a note: the note is in the email, escaped", async () => {
    sendEmail.mockResolvedValue();
    await notifyStudentOfDecision(student, { name: "Chess" }, false, "Try again in <March>");
    const html = sendEmail.mock.calls[0][0].html;
    expect(html).toContain("A note from the club");
    expect(html).toContain("Try again in &lt;March&gt;");
  });

  it("declined: says so, and a failing email never throws", async () => {
    sendEmail.mockRejectedValue(new Error("bounce"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(notifyStudentOfDecision(student, { name: "Chess" }, false)).resolves.toBeUndefined();
    expect(pushNotifications).toHaveBeenCalledWith(["s1"], expect.objectContaining({ type: "club_join_declined" }));
  });
});
