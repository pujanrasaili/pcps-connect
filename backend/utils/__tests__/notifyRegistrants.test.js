jest.mock("../../models/Registration");
jest.mock("../sendEmail");
jest.mock("../inApp");

const Registration = require("../../models/Registration");
const sendEmail = require("../sendEmail");
const { pushNotifications } = require("../inApp");
const { notifyEventRescheduled, notifyEventCancelled, notifyEventAnnouncement } = require("../notifyRegistrants");

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

describe("notifyEventAnnouncement", () => {
  afterEach(() => jest.clearAllMocks());

  it("emails every registrant the message and returns how many it tried", async () => {
    sendEmail.mockResolvedValue();
    mockRegistrants([
      { user: { name: "Asha", email: "asha@patancollege.edu.np" } },
      { user: { name: "Bibek", email: "bibek@patancollege.edu.np" } },
    ]);
    const count = await notifyEventAnnouncement(fakeEvent(), "Bring your laptop");
    expect(count).toBe(2);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail.mock.calls[0][0].html).toContain("Bring your laptop");
  });

  it("escapes HTML in the message but keeps line breaks", async () => {
    sendEmail.mockResolvedValue();
    mockRegistrants([{ user: { name: "Asha", email: "asha@patancollege.edu.np" } }]);
    await notifyEventAnnouncement(fakeEvent(), "<script>alert(1)</script>\nSecond line");
    const html = sendEmail.mock.calls[0][0].html;
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<br>Second line");
  });

  it("returns 0 when nobody is registered", async () => {
    mockRegistrants([]);
    expect(await notifyEventAnnouncement(fakeEvent(), "hi")).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("in-app notifications alongside the emails", () => {
  afterEach(() => jest.clearAllMocks());
  const regs = [{ user: { _id: "u1", name: "A", email: "a@x.np" } }, { user: { _id: "u2", name: "B", email: "b@x.np" } }];

  it("tells every registrant under the bell when an event changes", async () => {
    mockRegistrants(regs);
    await notifyEventRescheduled(fakeEvent({ location: "Hall" }), { oldDate: fakeEvent().date, oldLocation: "Lab 3" });
    expect(pushNotifications).toHaveBeenCalledWith(["u1", "u2"], expect.objectContaining({ type: "event_changed", link: "/events/event1" }));
  });

  it("links a cancelled event to the events list, since its own page is gone", async () => {
    mockRegistrants(regs);
    await notifyEventCancelled(fakeEvent());
    expect(pushNotifications).toHaveBeenCalledWith(["u1", "u2"], expect.objectContaining({ type: "event_cancelled", link: "/events" }));
  });

  it("tells registrants about an organiser's message", async () => {
    mockRegistrants(regs);
    await notifyEventAnnouncement(fakeEvent(), "Bring a laptop");
    expect(pushNotifications).toHaveBeenCalledWith(["u1", "u2"], expect.objectContaining({ type: "event_message" }));
  });

  it("does not notify anyone when an edit changed nothing that matters", async () => {
    mockRegistrants(regs);
    await notifyEventRescheduled(fakeEvent(), { oldDate: fakeEvent().date, oldLocation: "Lab 3" });
    expect(pushNotifications).not.toHaveBeenCalled();
  });
});
