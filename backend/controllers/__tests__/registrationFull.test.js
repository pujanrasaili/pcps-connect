process.env.JWT_SECRET = "test-secret";
jest.mock("../../models/Registration");
jest.mock("../../models/Event");
jest.mock("../../models/User");
jest.mock("../../utils/waitlist");
jest.mock("../../utils/sendEmail");
jest.mock("../../utils/inApp");
jest.mock("../../utils/eventOrganisers");

const Registration = require("../../models/Registration");
const Event = require("../../models/Event");
const User = require("../../models/User");
const sendEmail = require("../../utils/sendEmail");
const { pushNotifications, notifyAdmins } = require("../../utils/inApp");
const { organiserIds } = require("../../utils/eventOrganisers");
const { registerForEvent } = require("../registrationController");

const EVENT_ID = "64b7f0c2a1b2c3d4e5f60001";
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const event = (over = {}) => ({ _id: EVENT_ID, title: "Hack Night", capacity: 3, date: new Date(Date.now() + 864e5), createdBy: "organiser1", ...over });

async function register(ev, before, after, userId = "student1") {
  organiserIds.mockResolvedValue([ev.createdBy, "leader1"].filter(Boolean));
  Event.findById.mockResolvedValue(ev);
  Registration.findOne.mockResolvedValue(null);
  Registration.countDocuments.mockResolvedValueOnce(before).mockResolvedValueOnce(after);
  Registration.create.mockResolvedValue({ _id: "r1", status: "confirmed", deleteOne: jest.fn() });
  sendEmail.mockResolvedValue();
  const res = mockRes();
  await registerForEvent({ body: { eventId: EVENT_ID }, user: { _id: userId, name: "Asha", email: "a@patancollege.edu.np" } }, res);
  return res;
}

describe("the organiser hears when the last seat goes", () => {
  afterEach(() => jest.resetAllMocks());

  it("sends one bell message when the event becomes full", async () => {
    const res = await register(event(), 2, 3);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(pushNotifications).toHaveBeenCalledTimes(1);
    expect(pushNotifications).toHaveBeenCalledWith(["organiser1", "leader1"], { type: "event_full", title: "Hack Night is full", link: `/events/${EVENT_ID}` });
  });

  it("stays quiet for ordinary sign-ups", async () => {
    await register(event(), 0, 1);
    expect(pushNotifications).not.toHaveBeenCalled();
  });

  it("does not tell a person about their own sign-up", async () => {
    await register(event(), 2, 3, "organiser1");
    expect(pushNotifications).toHaveBeenCalledTimes(1);
    expect(pushNotifications.mock.calls[0][0]).toEqual(["leader1"]);
  });

  it("does nothing when nobody is left to tell", async () => {
    await register(event({ createdBy: undefined }), 2, 3, "leader1");
    expect(pushNotifications).not.toHaveBeenCalled();
  });
});

describe("approval requests reach the hosting clubs' leaders", () => {
  afterEach(() => jest.resetAllMocks());

  async function request(userId = "student1") {
    Event.findById.mockResolvedValue(event({ requiresApproval: true, capacity: 50 }));
    Registration.findOne.mockResolvedValue(null);
    Registration.countDocuments.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    Registration.create.mockResolvedValue({ _id: "r1", status: "pending", deleteOne: jest.fn() });
    sendEmail.mockResolvedValue();
    organiserIds.mockResolvedValue(["organiser1", "leader1", userId]);
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: "leader1" }]) });
    const res = mockRes();
    await registerForEvent({ body: { eventId: EVENT_ID }, user: { _id: userId, name: "Asha", email: "a@patancollege.edu.np" } }, res);
    return res;
  }

  it("tells admins and the leaders who are not admins", async () => {
    const res = await request();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(notifyAdmins).toHaveBeenCalledWith(expect.objectContaining({ type: "join_request", title: "Asha asked to join Hack Night" }));
    expect(User.find).toHaveBeenCalledWith({ _id: { $in: ["organiser1", "leader1"] }, role: { $ne: "admin" } });
    expect(pushNotifications).toHaveBeenCalledWith(["leader1"], expect.objectContaining({ type: "join_request", link: "/admin/events" }));
  });

  it("still succeeds when the leader lookup fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    Event.findById.mockResolvedValue(event({ requiresApproval: true, capacity: 50 }));
    Registration.findOne.mockResolvedValue(null);
    Registration.countDocuments.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    Registration.create.mockResolvedValue({ _id: "r1", status: "pending", deleteOne: jest.fn() });
    sendEmail.mockResolvedValue();
    organiserIds.mockRejectedValue(new Error("down"));
    const res = mockRes();
    await registerForEvent({ body: { eventId: EVENT_ID }, user: { _id: "s1", name: "Asha", email: "a@patancollege.edu.np" } }, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
