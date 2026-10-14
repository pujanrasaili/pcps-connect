jest.mock("../../models/Registration");
jest.mock("../sendEmail");

const Registration = require("../../models/Registration");
const sendEmail = require("../sendEmail");
const { notifyEventRescheduled, notifyEventCancelled } = require("../notifyRegistrants");

// Registration.find(...).populate(...) -- mongoose's Query object is
// chainable then awaitable; mocked here the same shape so the real
// `await Registration.find({ event: id }).populate("user", ...)` call in
// notifyRegistrants works against it.
function mockRegistrants(registrants) {
  Registration.find.mockReturnValue({
    populate: jest.fn().mockResolvedValue(registrants),
  });
}

function fakeEvent(overrides = {}) {
  return {
    _id: "event1",
    title: "Hack Night",
    date: new Date("2026-12-01T18:00:00Z"),
    location: "Lab 3",
    ...overrides,
  };
}

describe("notifyEventRescheduled", () => {
  afterEach(() => jest.clearAllMocks());

  it("sends nothing when neither date nor location changed", async () => {
    mockRegistrants([{ user: { name: "Asha", email: "asha@patancollege.edu.np" } }]);
    const event = fakeEvent();

    await notifyEventRescheduled(event, { oldDate: event.date, oldLocation: event.location });

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("notifies every registrant when the date changed", async () => {
    sendEmail.mockResolvedValue();
    mockRegistrants([
      { user: { name: "Asha", email: "asha@patancollege.edu.np" } },
      { user: { name: "Bibek", email: "bibek@patancollege.edu.np" } },
    ]);
    const event = fakeEvent({ date: new Date("2026-12-05T18:00:00Z") });
    const oldDate = new Date("2026-12-01T18:00:00Z");

    await notifyEventRescheduled(event, { oldDate, oldLocation: event.location });

    expect(sendEmail).toHaveBeenCalledTimes(2);
    const recipients = sendEmail.mock.calls.map(([arg]) => arg.to);
    expect(recipients).toEqual(
      expect.arrayContaining(["asha@patancollege.edu.np", "bibek@patancollege.edu.np"])
    );
    expect(sendEmail.mock.calls[0][0].html).toContain("New date/time");
  });

  it("notifies registrants when the location changed", async () => {
    sendEmail.mockResolvedValue();
    mockRegistrants([{ user: { name: "Asha", email: "asha@patancollege.edu.np" } }]);
    const event = fakeEvent({ location: "Main Auditorium" });

    await notifyEventRescheduled(event, { oldDate: event.date, oldLocation: "Lab 3" });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0].html).toContain("New location");
    expect(sendEmail.mock.calls[0][0].html).toContain("Main Auditorium");
  });

  it("skips a registration whose user no longer exists (deleted account) without throwing", async () => {
    sendEmail.mockResolvedValue();
    mockRegistrants([{ user: null }, { user: { name: "Asha", email: "asha@patancollege.edu.np" } }]);
    const event = fakeEvent({ location: "Main Auditorium" });

    await expect(
      notifyEventRescheduled(event, { oldDate: event.date, oldLocation: "Lab 3" })
    ).resolves.not.toThrow();
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("one failed send doesn't stop the others from going out", async () => {
    sendEmail
      .mockRejectedValueOnce(new Error("mailbox full"))
      .mockResolvedValueOnce();
    mockRegistrants([
      { user: { name: "Asha", email: "asha@patancollege.edu.np" } },
      { user: { name: "Bibek", email: "bibek@patancollege.edu.np" } },
    ]);
    const event = fakeEvent({ location: "Main Auditorium" });

    await notifyEventRescheduled(event, { oldDate: event.date, oldLocation: "Lab 3" });

    expect(sendEmail).toHaveBeenCalledTimes(2);
  });
});

describe("notifyEventCancelled", () => {
  afterEach(() => jest.clearAllMocks());

  it("notifies every registrant that the event was cancelled", async () => {
    sendEmail.mockResolvedValue();
    mockRegistrants([
      { user: { name: "Asha", email: "asha@patancollege.edu.np" } },
      { user: { name: "Bibek", email: "bibek@patancollege.edu.np" } },
    ]);
    const event = fakeEvent();

    await notifyEventCancelled(event);

    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail.mock.calls[0][0].subject).toMatch(/cancelled/i);
    expect(sendEmail.mock.calls[0][0].html).toContain("Hack Night");
  });

  it("does nothing (no throw) when there are no registrants", async () => {
    mockRegistrants([]);
    await expect(notifyEventCancelled(fakeEvent())).resolves.not.toThrow();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
