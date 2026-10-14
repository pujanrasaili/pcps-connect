jest.mock("../../models/Registration");
jest.mock("../../models/Event");
// Without this, registerForEvent's best-effort confirmation email would make
// a real SMTP connection attempt during every test run (no EMAIL_USER/
// EMAIL_APP_PASSWORD in CI) -- mocked so tests stay fast and deterministic.
jest.mock("../../utils/sendEmail");

const Registration = require("../../models/Registration");
const Event = require("../../models/Event");
const sendEmail = require("../../utils/sendEmail");
const { registerForEvent, cancelRegistration } = require("../registrationController");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const USER_ID = "user1";
const EVENT_ID = "event1";

function futureEvent(overrides = {}) {
  return { _id: EVENT_ID, capacity: 2, date: new Date(Date.now() + 86400000), ...overrides };
}

describe("registerForEvent", () => {
  afterEach(() => jest.clearAllMocks());

  it("400s when eventId is missing from the body", async () => {
    const req = { body: {}, user: { _id: USER_ID } };
    const res = mockRes();
    await registerForEvent(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("404s when the event doesn't exist", async () => {
    Event.findById.mockResolvedValue(null);
    const req = { body: { eventId: EVENT_ID }, user: { _id: USER_ID } };
    const res = mockRes();
    await registerForEvent(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("refuses registration for an event that already happened", async () => {
    Event.findById.mockResolvedValue(futureEvent({ date: new Date(Date.now() - 86400000) }));
    const req = { body: { eventId: EVENT_ID }, user: { _id: USER_ID } };
    const res = mockRes();
    await registerForEvent(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/already taken place/i) })
    );
    expect(Registration.create).not.toHaveBeenCalled();
  });

  it("refuses a second registration for the same user+event", async () => {
    Event.findById.mockResolvedValue(futureEvent());
    Registration.findOne.mockResolvedValue({ _id: "existing-reg" });
    const req = { body: { eventId: EVENT_ID }, user: { _id: USER_ID } };
    const res = mockRes();
    await registerForEvent(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Registration.create).not.toHaveBeenCalled();
  });

  it("refuses registration once the event is already at capacity", async () => {
    Event.findById.mockResolvedValue(futureEvent({ capacity: 2 }));
    Registration.findOne.mockResolvedValue(null);
    Registration.countDocuments.mockResolvedValue(2); // already full
    const req = { body: { eventId: EVENT_ID }, user: { _id: USER_ID } };
    const res = mockRes();
    await registerForEvent(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "This event is full" }));
    expect(Registration.create).not.toHaveBeenCalled();
  });

  it("succeeds when there's room and no prior registration, and sends a confirmation email", async () => {
    const event = futureEvent({ capacity: 2, title: "Hack Night", location: "Lab 3" });
    Event.findById.mockResolvedValue(event);
    Registration.findOne.mockResolvedValue(null);
    Registration.countDocuments
      .mockResolvedValueOnce(1) // pre-insert count: 1 of 2 taken
      .mockResolvedValueOnce(2); // post-insert recount: now 2 of 2 -- still within capacity
    const deleteOne = jest.fn();
    Registration.create.mockResolvedValue({ _id: "new-reg", deleteOne });
    sendEmail.mockResolvedValue();

    const req = {
      body: { eventId: EVENT_ID },
      user: { _id: USER_ID, name: "Asha Gurung", email: "asha@patancollege.edu.np" },
    };
    const res = mockRes();
    await registerForEvent(req, res);

    expect(Registration.create).toHaveBeenCalledWith({
      user: USER_ID,
      event: EVENT_ID,
      status: "confirmed",
    });
    expect(deleteOne).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const emailArg = sendEmail.mock.calls[0][0];
    expect(emailArg.to).toBe("asha@patancollege.edu.np");
    expect(emailArg.subject).toMatch(/Hack Night/);
    expect(emailArg.html).toContain("Hack Night");
    expect(emailArg.html).toContain("Lab 3");
  });

  // A failed email send is a side effect, never a reason to fail a
  // registration that already succeeded -- same best-effort pattern as
  // verification/reset/contact emails elsewhere in this app.
  it("still returns 201 if the confirmation email fails to send", async () => {
    Event.findById.mockResolvedValue(futureEvent({ capacity: 2 }));
    Registration.findOne.mockResolvedValue(null);
    Registration.countDocuments.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    Registration.create.mockResolvedValue({ _id: "new-reg", deleteOne: jest.fn() });
    sendEmail.mockRejectedValue(new Error("SMTP down"));

    const req = {
      body: { eventId: EVENT_ID },
      user: { _id: USER_ID, name: "Asha Gurung", email: "asha@patancollege.edu.np" },
    };
    const res = mockRes();
    await registerForEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  // Regression test for the overbooking race condition fixed this
  // session: the pre-insert capacity check and the insert itself aren't
  // one atomic operation, so two requests for the last spot can both pass
  // the check. The post-insert recount must catch and roll back the one
  // that actually overbooks.
  it("rolls back the insert if the recount after insert shows the event went over capacity (race condition)", async () => {
    Event.findById.mockResolvedValue(futureEvent({ capacity: 2 }));
    Registration.findOne.mockResolvedValue(null);
    Registration.countDocuments
      .mockResolvedValueOnce(1) // pre-insert count looked fine (1 of 2)
      .mockResolvedValueOnce(3); // but a concurrent request also squeezed in -- now 3 of 2
    const deleteOne = jest.fn().mockResolvedValue();
    Registration.create.mockResolvedValue({ _id: "new-reg", deleteOne });

    const req = { body: { eventId: EVENT_ID }, user: { _id: USER_ID } };
    const res = mockRes();
    await registerForEvent(req, res);

    expect(deleteOne).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "This event is full" }));
  });

  it("treats a duplicate-key error from a simultaneous double-click as 'already registered', not a 500", async () => {
    Event.findById.mockResolvedValue(futureEvent());
    Registration.findOne.mockResolvedValue(null);
    Registration.countDocuments.mockResolvedValue(0);
    const dupError = new Error("E11000 duplicate key error");
    dupError.code = 11000;
    Registration.create.mockRejectedValue(dupError);

    const req = { body: { eventId: EVENT_ID }, user: { _id: USER_ID } };
    const res = mockRes();
    await registerForEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "You are already registered for this event" })
    );
  });
});

describe("cancelRegistration", () => {
  afterEach(() => jest.clearAllMocks());

  it("404s when the registration doesn't exist", async () => {
    Registration.findById.mockResolvedValue(null);
    const req = { params: { id: "missing" }, user: { _id: USER_ID } };
    const res = mockRes();
    await cancelRegistration(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("403s when the registration belongs to a different user", async () => {
    Registration.findById.mockResolvedValue({
      user: { toString: () => "someone-else" },
      deleteOne: jest.fn(),
    });
    const req = { params: { id: "reg1" }, user: { _id: USER_ID } };
    const res = mockRes();
    await cancelRegistration(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("deletes the registration when it belongs to the requesting user", async () => {
    const deleteOne = jest.fn().mockResolvedValue();
    Registration.findById.mockResolvedValue({
      user: { toString: () => USER_ID },
      deleteOne,
    });
    const req = { params: { id: "reg1" }, user: { _id: { toString: () => USER_ID } } };
    const res = mockRes();
    await cancelRegistration(req, res);
    expect(deleteOne).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
