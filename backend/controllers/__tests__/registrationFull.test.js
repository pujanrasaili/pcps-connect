process.env.JWT_SECRET = "test-secret";
jest.mock("../../models/Registration");
jest.mock("../../models/Event");
jest.mock("../../utils/waitlist");
jest.mock("../../utils/sendEmail");
jest.mock("../../utils/inApp");

const Registration = require("../../models/Registration");
const Event = require("../../models/Event");
const sendEmail = require("../../utils/sendEmail");
const { pushNotifications } = require("../../utils/inApp");
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
    expect(pushNotifications).toHaveBeenCalledWith(["organiser1"], { type: "event_full", title: "Hack Night is full", link: `/events/${EVENT_ID}` });
  });

  it("stays quiet for ordinary sign-ups", async () => {
    await register(event(), 0, 1);
    expect(pushNotifications).not.toHaveBeenCalled();
  });

  it("does not tell the organiser about their own sign-up", async () => {
    await register(event(), 2, 3, "organiser1");
    expect(pushNotifications).not.toHaveBeenCalled();
  });

  it("does nothing for an event with no recorded organiser", async () => {
    await register(event({ createdBy: undefined }), 2, 3);
    expect(pushNotifications).not.toHaveBeenCalled();
  });
});
