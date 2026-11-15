jest.mock("../../models/User");
jest.mock("../../models/Registration");
jest.mock("../../models/Notification");
jest.mock("../inApp");

const User = require("../../models/User");
const Registration = require("../../models/Registration");
const Notification = require("../../models/Notification");
const { pushNotifications } = require("../inApp");
const { remindSavers } = require("../savedReminders");

const NOW = new Date("2030-01-10T12:00:00Z");
const EV = { _id: "e1", title: "Hack Night", date: new Date("2030-01-11T09:00:00Z") };
const select = (rows) => ({ select: jest.fn().mockResolvedValue(rows) });

function setup({ savers = [{ _id: "u1" }, { _id: "u2" }, { _id: "u3" }], joined = [], told = [] } = {}) {
  User.find.mockReturnValue(select(savers));
  Registration.find.mockReturnValue(select(joined));
  Notification.find.mockReturnValue(select(told));
  pushNotifications.mockImplementation(async (ids) => ids.length);
}
afterEach(() => jest.resetAllMocks());

describe("remindSavers", () => {
  it("nudges students who saved the event, have not joined and have not been nudged", async () => {
    setup({ joined: [{ user: "u1" }], told: [{ user: "u2" }] });
    const n = await remindSavers(EV, NOW);
    expect(n).toBe(1);
    expect(User.find).toHaveBeenCalledWith({ savedEvents: "e1", eventReminders: { $ne: false } });
    expect(Registration.find).toHaveBeenCalledWith({ event: "e1", user: { $in: ["u1", "u2", "u3"] }, status: { $ne: "cancelled" } });
    expect(Notification.find).toHaveBeenCalledWith({ type: "saved_reminder", link: "/events/e1", user: { $in: ["u1", "u2", "u3"] } });
    const [ids, message] = pushNotifications.mock.calls[0];
    expect(ids).toEqual(["u3"]);
    expect(message.type).toBe("saved_reminder");
    expect(message.link).toBe("/events/e1");
    expect(message.title).toMatch(/^You saved Hack Night: it is on /);
  });

  it("does nothing once registration has closed", async () => {
    setup();
    expect(await remindSavers({ ...EV, registrationDeadline: new Date("2030-01-10T10:00:00Z") }, NOW)).toBe(0);
    expect(User.find).not.toHaveBeenCalled();
  });

  it("does nothing when nobody saved it", async () => {
    setup({ savers: [] });
    expect(await remindSavers(EV, NOW)).toBe(0);
    expect(Registration.find).not.toHaveBeenCalled();
    expect(pushNotifications).not.toHaveBeenCalled();
  });
});
