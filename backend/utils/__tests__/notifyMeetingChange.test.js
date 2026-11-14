jest.mock("../../models/ClubMembership");
jest.mock("../inApp");

const ClubMembership = require("../../models/ClubMembership");
const { pushNotifications } = require("../inApp");
const { notifyMeetingChange } = require("../notifyMeetingChange");

const club = { _id: "c1", name: "Tech", meetings: "Saturdays 10 AM" };
const members = (...ids) => ({ select: jest.fn().mockResolvedValue(ids.map((user) => ({ user }))) });

afterEach(() => jest.resetAllMocks());

describe("notifyMeetingChange", () => {
  it("tells every member when the line changes", async () => {
    ClubMembership.find.mockReturnValue(members("u1", "u2"));
    pushNotifications.mockResolvedValue(2);
    expect(await notifyMeetingChange(club, "Fridays 4 PM")).toBe(2);
    expect(ClubMembership.find).toHaveBeenCalledWith({ club: "c1" });
    expect(pushNotifications).toHaveBeenCalledWith(["u1", "u2"], { type: "club_meetings", title: "Tech updated its meeting time", link: "/clubs?club=c1" });
  });

  it("tells a club's first-ever line too", async () => {
    ClubMembership.find.mockReturnValue(members("u1"));
    await notifyMeetingChange(club, "");
    expect(pushNotifications).toHaveBeenCalled();
  });

  it("tells nobody when it is unchanged (ignoring spaces) or cleared", async () => {
    expect(await notifyMeetingChange(club, " Saturdays 10 AM ")).toBe(0);
    expect(await notifyMeetingChange({ ...club, meetings: "  " }, "Fridays")).toBe(0);
    expect(await notifyMeetingChange({ ...club, meetings: undefined }, "Fridays")).toBe(0);
    expect(ClubMembership.find).not.toHaveBeenCalled();
  });

  it("never throws when the lookup fails", async () => {
    ClubMembership.find.mockImplementation(() => { throw new Error("db down"); });
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect(await notifyMeetingChange(club, "Fridays")).toBe(0);
  });
});
