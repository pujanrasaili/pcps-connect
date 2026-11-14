jest.mock("../../models/User");
jest.mock("../../models/ClubMembership");
jest.mock("../inApp");

const User = require("../../models/User");
const ClubMembership = require("../../models/ClubMembership");
const { pushNotifications } = require("../inApp");
const { notifyInterestedStudents } = require("../notifyInterested");

const event = { _id: "e1", title: "Python Night", category: "Workshop" };
const users = (...ids) => ({ select: jest.fn().mockResolvedValue(ids.map((_id) => ({ _id }))) });

describe("notifyInterestedStudents", () => {
  beforeEach(() => pushNotifications.mockResolvedValue(0));
  afterEach(() => jest.resetAllMocks());

  it("tells approved students who follow the topic, matched in lower case", async () => {
    User.find.mockReturnValue(users("u1", "u2"));
    pushNotifications.mockResolvedValue(2);
    expect(await notifyInterestedStudents(event)).toBe(2);
    expect(User.find).toHaveBeenCalledWith({ interests: "workshop", approvalStatus: "approved", clubUpdates: { $ne: false } });
    expect(pushNotifications).toHaveBeenCalledWith(["u1", "u2"], { type: "interest_event", title: "New Workshop event: Python Night", link: "/events/e1" });
  });

  it("skips members of the hosting clubs, who were already told", async () => {
    User.find.mockReturnValue(users("u1", "u2", "u3"));
    ClubMembership.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ user: "u2" }]) });
    await notifyInterestedStudents(event, ["c1", null, "c2"]);
    expect(ClubMembership.find).toHaveBeenCalledWith({ club: { $in: ["c1", "c2"] } });
    expect(pushNotifications.mock.calls[0][0]).toEqual(["u1", "u3"]);
  });

  it.each([["General"], ["general "], [""], [undefined]])("the default or empty category %p notifies nobody", async (category) => {
    expect(await notifyInterestedStudents({ ...event, category })).toBe(0);
    expect(User.find).not.toHaveBeenCalled();
  });

  it("does nothing when no one follows the topic", async () => {
    User.find.mockReturnValue(users());
    expect(await notifyInterestedStudents(event)).toBe(0);
    expect(pushNotifications).not.toHaveBeenCalled();
  });

  it("never throws when the lookup fails", async () => {
    User.find.mockImplementation(() => { throw new Error("db down"); });
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect(await notifyInterestedStudents(event)).toBe(0);
  });
});
