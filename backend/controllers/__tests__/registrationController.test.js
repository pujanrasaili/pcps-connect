process.env.JWT_SECRET = "test-secret";
jest.mock("../../models/Registration");
jest.mock("../../models/Event");
jest.mock("../../utils/waitlist");
// Without this, registerForEvent's best-effort confirmation email would make
// a real SMTP connection attempt during every test run (no EMAIL_USER/
// EMAIL_APP_PASSWORD in CI) -- mocked so tests stay fast and deterministic.
jest.mock("../../utils/sendEmail");

const Registration = require("../../models/Registration");
const Event = require("../../models/Event");
const sendEmail = require("../../utils/sendEmail");
const { promoteFromWaitlist } = require("../../utils/waitlist");
const { verifyCheckInCode } = require("../../utils/checkInCode");
const { verifyCertificateCode } = require("../../utils/certificateCode");
const { registerForEvent, cancelRegistration, submitFeedback, getCheckInCode, getCertificate } = require("../registrationController");

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
    // Carries a calendar invite so mail apps can offer "add to calendar".
    expect(emailArg.icalEvent).toContain("BEGIN:VEVENT");
    expect(emailArg.icalEvent).toContain("SUMMARY:Hack Night");
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
    Event.findById.mockResolvedValue(futureEvent());
    const req = { params: { id: "reg1" }, user: { _id: { toString: () => USER_ID } } };
    const res = mockRes();
    await cancelRegistration(req, res);
    expect(deleteOne).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("offers the freed seat to the waitlist after a cancellation", async () => {
    const deleteOne = jest.fn().mockResolvedValue();
    const ev = futureEvent();
    Registration.findById.mockResolvedValue({ user: { toString: () => USER_ID }, event: EVENT_ID, deleteOne });
    Event.findById.mockResolvedValue(ev);
    promoteFromWaitlist.mockResolvedValue(1);
    const res = mockRes();
    await cancelRegistration({ params: { id: "reg1" }, user: { _id: { toString: () => USER_ID } } }, res);
    expect(promoteFromWaitlist).toHaveBeenCalledWith(ev);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("still cancels successfully if promoting from the waitlist throws", async () => {
    const deleteOne = jest.fn().mockResolvedValue();
    Registration.findById.mockResolvedValue({ user: { toString: () => USER_ID }, event: EVENT_ID, deleteOne });
    Event.findById.mockResolvedValue(futureEvent());
    promoteFromWaitlist.mockRejectedValue(new Error("db hiccup"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    const res = mockRes();
    await cancelRegistration({ params: { id: "reg1" }, user: { _id: { toString: () => USER_ID } } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("refuses to cancel once the event has already taken place", async () => {
    const deleteOne = jest.fn().mockResolvedValue();
    Registration.findById.mockResolvedValue({
      user: { toString: () => USER_ID },
      event: EVENT_ID,
      deleteOne,
    });
    Event.findById.mockResolvedValue(futureEvent({ date: new Date(Date.now() - 86400000) }));
    const req = { params: { id: "reg1" }, user: { _id: { toString: () => USER_ID } } };
    const res = mockRes();
    await cancelRegistration(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(deleteOne).not.toHaveBeenCalled();
  });

  it("still cleans up a registration whose event was already deleted", async () => {
    const deleteOne = jest.fn().mockResolvedValue();
    Registration.findById.mockResolvedValue({
      user: { toString: () => USER_ID },
      event: EVENT_ID,
      deleteOne,
    });
    Event.findById.mockResolvedValue(null);
    const req = { params: { id: "reg1" }, user: { _id: { toString: () => USER_ID } } };
    const res = mockRes();
    await cancelRegistration(req, res);
    expect(deleteOne).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("submitFeedback", () => {
  afterEach(() => jest.clearAllMocks());

  const reg = (over = {}) => ({
    user: { toString: () => USER_ID },
    attended: true,
    save: jest.fn().mockResolvedValue(),
    ...over,
  });
  const call = (body, id = "reg1") => {
    const res = mockRes();
    return submitFeedback({ params: { id }, body, user: { _id: { toString: () => USER_ID } } }, res).then(() => res);
  };

  it.each([[0], [6], [3.5], ["5"], [null], [undefined]])("rejects rating %p", async (rating) => {
    const res = await call({ rating });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Registration.findById).not.toHaveBeenCalled();
  });

  it("rejects non-text or overlong feedback", async () => {
    expect((await call({ rating: 4, feedback: { a: 1 } })).status).toHaveBeenCalledWith(400);
    expect((await call({ rating: 4, feedback: "x".repeat(501) })).status).toHaveBeenCalledWith(400);
  });

  it("404s for an unknown registration", async () => {
    Registration.findById.mockResolvedValue(null);
    expect((await call({ rating: 4 })).status).toHaveBeenCalledWith(404);
  });

  it("403s for someone else's registration", async () => {
    Registration.findById.mockResolvedValue(reg({ user: { toString: () => "someone-else" } }));
    const res = await call({ rating: 4 });
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("refuses unless the student was marked as attended", async () => {
    const r = reg({ attended: false });
    Registration.findById.mockResolvedValue(r);
    const res = await call({ rating: 5 });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(r.save).not.toHaveBeenCalled();
  });

  it("saves a trimmed rating and comment for an attendee", async () => {
    const r = reg();
    Registration.findById.mockResolvedValue(r);
    const res = await call({ rating: 5, feedback: "  Great session  " });
    expect(r.rating).toBe(5);
    expect(r.feedback).toBe("Great session");
    expect(r.save).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("allows a rating with no comment", async () => {
    const r = reg();
    Registration.findById.mockResolvedValue(r);
    await call({ rating: 3 });
    expect(r.feedback).toBe("");
  });
});

describe("getCheckInCode", () => {
  afterEach(() => jest.clearAllMocks());

  const call = (id = "a".repeat(24)) => {
    const res = mockRes();
    return getCheckInCode({ params: { id }, user: { _id: { toString: () => USER_ID } } }, res).then(() => res);
  };

  it("404s for an unknown registration", async () => {
    Registration.findById.mockResolvedValue(null);
    expect((await call()).status).toHaveBeenCalledWith(404);
  });

  it("403s for someone else's registration", async () => {
    Registration.findById.mockResolvedValue({ _id: "a".repeat(24), user: { toString: () => "other" } });
    expect((await call()).status).toHaveBeenCalledWith(403);
  });

  it("returns a code that verifies back to the registration", async () => {
    const id = "a".repeat(24);
    Registration.findById.mockResolvedValue({ _id: id, user: { toString: () => USER_ID } });
    const res = await call(id);
    const { code } = res.json.mock.calls[0][0];
    expect(verifyCheckInCode(code)).toBe(id);
  });
});

// findById(...).populate(...).populate(...) resolves to the document
function chain(doc) {
  const q = { populate: jest.fn() };
  q.populate.mockReturnValue(q);
  q.then = (resolve, reject) => Promise.resolve(doc).then(resolve, reject);
  return q;
}

describe("getCertificate", () => {
  afterEach(() => jest.clearAllMocks());

  const REG_ID = "a".repeat(24);
  const reg = (over = {}) => ({
    _id: REG_ID,
    attended: true,
    user: { _id: { toString: () => USER_ID }, name: "Sita", studentId: "S-1", program: "BCA" },
    event: { title: "Hack Night", date: new Date("2027-01-01"), location: "Lab", club: { name: "Tech Club" } },
    ...over,
  });
  const call = () => {
    const res = mockRes();
    return getCertificate({ params: { id: REG_ID }, user: { _id: { toString: () => USER_ID } } }, res).then(() => res);
  };

  it("404s for an unknown registration", async () => {
    Registration.findById.mockReturnValue(chain(null));
    expect((await call()).status).toHaveBeenCalledWith(404);
  });

  it("403s for someone else's registration", async () => {
    Registration.findById.mockReturnValue(chain(reg({ user: { _id: { toString: () => "other" }, name: "X" } })));
    expect((await call()).status).toHaveBeenCalledWith(403);
  });

  it("refuses unless the student was marked as attended", async () => {
    Registration.findById.mockReturnValue(chain(reg({ attended: false })));
    expect((await call()).status).toHaveBeenCalledWith(400);
  });

  it("returns the certificate details and a verifiable code", async () => {
    Registration.findById.mockReturnValue(chain(reg()));
    const res = await call();
    const { certificate } = res.json.mock.calls[0][0];
    expect(certificate).toEqual(
      expect.objectContaining({ studentName: "Sita", eventTitle: "Hack Night", clubName: "Tech Club", program: "BCA" })
    );
    expect(verifyCertificateCode(certificate.code)).toBe(REG_ID);
  });
});
