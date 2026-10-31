jest.mock("../../models/Event");
jest.mock("../../models/Registration");
jest.mock("../../models/WaitlistEntry");
jest.mock("../../models/EventQuestion");
jest.mock("../../models/ClubMembership");
jest.mock("../../models/Club");
jest.mock("../../models/ClubPost");
jest.mock("../../models/Notification");
jest.mock("../notifyRegistrants");

const Event = require("../../models/Event");
const Registration = require("../../models/Registration");
const WaitlistEntry = require("../../models/WaitlistEntry");
const ClubMembership = require("../../models/ClubMembership");
const Club = require("../../models/Club");
const ClubPost = require("../../models/ClubPost");
const { notifyEventCancelled } = require("../notifyRegistrants");
const EventQuestion = require("../../models/EventQuestion");
const { removeUserAndData } = require("../deleteAccountData");

afterEach(() => jest.resetAllMocks());

describe("removeUserAndData", () => {
  it("removes everything tied to a student with no events of their own", async () => {
    Event.find.mockResolvedValue([]);
    const user = { _id: "u1", deleteOne: jest.fn().mockResolvedValue() };
    await removeUserAndData(user);
    expect(notifyEventCancelled).not.toHaveBeenCalled();
    expect(Registration.deleteMany).toHaveBeenCalledWith({ user: "u1" });
    expect(WaitlistEntry.deleteMany).toHaveBeenCalledWith({ user: "u1" });
    expect(ClubMembership.deleteMany).toHaveBeenCalledWith({ user: "u1" });
    expect(Club.updateMany).toHaveBeenCalledWith({ leaders: "u1" }, { $pull: { leaders: "u1" } });
    expect(ClubPost.updateMany).toHaveBeenCalledWith({ author: "u1" }, { authorName: "Former club leader" });
    expect(EventQuestion.deleteMany).toHaveBeenCalledWith({ author: "u1" });
    expect(user.deleteOne).toHaveBeenCalled();
  });

  it("only looks at upcoming events, so past events (history) are never touched", async () => {
    Event.find.mockResolvedValue([]);
    await removeUserAndData({ _id: "u1", deleteOne: jest.fn().mockResolvedValue() });
    const filter = Event.find.mock.calls[0][0];
    expect(filter.createdBy).toBe("u1");
    expect(filter.date.$gte).toBeInstanceOf(Date);
    expect(Event.deleteMany).not.toHaveBeenCalled();
  });

  it("cancels upcoming events they created: notifies first, then deletes those events' registrations", async () => {
    const order = [];
    Event.find.mockResolvedValue([{ _id: "e1" }, { _id: "e2" }]);
    notifyEventCancelled.mockImplementation(async () => order.push("notify"));
    Registration.deleteMany.mockImplementation(async () => order.push("deleteRegs"));
    const user = { _id: "u1", deleteOne: jest.fn().mockResolvedValue() };
    await removeUserAndData(user);
    expect(notifyEventCancelled).toHaveBeenCalledTimes(2);
    expect(order.slice(0, 3)).toEqual(["notify", "notify", "deleteRegs"]);
    expect(Registration.deleteMany).toHaveBeenCalledWith({ event: { $in: ["e1", "e2"] } });
    expect(Event.deleteMany).toHaveBeenCalledWith({ _id: { $in: ["e1", "e2"] } });
  });
});
