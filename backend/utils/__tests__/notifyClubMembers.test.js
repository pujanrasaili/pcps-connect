jest.mock("../../models/ClubMembership");
jest.mock("../sendEmail");

const ClubMembership = require("../../models/ClubMembership");
const sendEmail = require("../sendEmail");
const { notifyNewClubEvent } = require("../notifyClubMembers");

const club = { _id: "c1", name: "PCPS Tech Club" };
const event = { title: "Hack Night", date: new Date("2027-01-01T10:00:00Z"), location: "Lab 3" };
const member = (n, extra = {}) => ({ user: { name: `S${n}`, email: `s${n}@patancollege.edu.np`, ...extra } });

function members(list) {
  ClubMembership.find.mockReturnValue({ populate: jest.fn().mockResolvedValue(list) });
}

describe("notifyNewClubEvent", () => {
  beforeEach(() => sendEmail.mockResolvedValue());
  afterEach(() => jest.resetAllMocks());

  it("emails every member of the club", async () => {
    members([member(1), member(2)]);
    expect(await notifyNewClubEvent(event, club)).toBe(2);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "s1@patancollege.edu.np" }));
  });

  it("skips members who turned club updates off, but not those who never set it", async () => {
    members([member(1, { clubUpdates: false }), member(2, { clubUpdates: true }), member(3)]);
    expect(await notifyNewClubEvent(event, club)).toBe(2);
    const recipients = sendEmail.mock.calls.map((c) => c[0].to);
    expect(recipients).not.toContain("s1@patancollege.edu.np");
  });

  it("skips memberships whose account no longer exists", async () => {
    members([{ user: null }, member(2)]);
    expect(await notifyNewClubEvent(event, club)).toBe(1);
  });

  it("one failed send doesn't stop the others or throw", async () => {
    members([member(1), member(2)]);
    sendEmail.mockRejectedValueOnce(new Error("bounce")).mockResolvedValue();
    jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(notifyNewClubEvent(event, club)).resolves.toBe(2);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("returns 0 and doesn't throw if the member lookup fails", async () => {
    ClubMembership.find.mockReturnValue({ populate: jest.fn().mockRejectedValue(new Error("db down")) });
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect(await notifyNewClubEvent(event, club)).toBe(0);
  });

  it("escapes HTML in the club and event names", async () => {
    members([member(1)]);
    await notifyNewClubEvent({ ...event, title: "<script>x</script>" }, { ...club, name: "A&B" });
    const html = sendEmail.mock.calls[0][0].html;
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("A&amp;B");
  });
});
