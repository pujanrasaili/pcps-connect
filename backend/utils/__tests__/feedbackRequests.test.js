process.env.CLIENT_ORIGIN = "https://app.test";
jest.mock("../../models/Event");
jest.mock("../../models/Registration");
jest.mock("../sendEmail");
jest.mock("../inApp");

const Event = require("../../models/Event");
const Registration = require("../../models/Registration");
const sendEmail = require("../sendEmail");
const { pushNotifications } = require("../inApp");
const { requestFeedback, getFeedbackWindow } = require("../feedbackRequests");

const NOW = new Date("2030-01-10T12:00:00Z");
const EV = { _id: "e1", title: "Hack <Night>", date: new Date("2030-01-09T10:00:00Z") };
const row = (user, extra = {}) => ({ user, feedbackAsked: false, save: jest.fn().mockResolvedValue(), ...extra });
const asha = { _id: "u1", name: "Asha", email: "asha@patancollege.edu.np", language: "en", eventReminders: true };

function setup(rows, events = [EV]) {
  Event.find.mockResolvedValue(events);
  Registration.find.mockReturnValue({ populate: jest.fn().mockResolvedValue(rows) });
  sendEmail.mockResolvedValue();
}

afterEach(() => jest.resetAllMocks());

describe("getFeedbackWindow", () => {
  it("is from three days ago to three hours ago", () => {
    const { start, end } = getFeedbackWindow(NOW);
    expect(NOW - start).toBe(72 * 3600 * 1000);
    expect(NOW - end).toBe(3 * 3600 * 1000);
  });
});

describe("requestFeedback", () => {
  it("asks attended, unrated students once: bell, email, then marks them", async () => {
    const r = row(asha);
    setup([r]);
    const out = await requestFeedback(NOW);
    expect(out).toEqual({ events: 1, sent: 1, failed: 0 });
    expect(Registration.find).toHaveBeenCalledWith({ event: "e1", attended: true, feedbackAsked: false, rating: null });
    expect(pushNotifications).toHaveBeenCalledWith(["u1"], { type: "feedback_request", title: "How was Hack <Night>? Rate it", link: "/profile" });
    const mail = sendEmail.mock.calls[0][0];
    expect(mail.to).toBe("asha@patancollege.edu.np");
    expect(mail.subject).toBe("How was Hack <Night>?");
    expect(mail.html).toContain("Hack &lt;Night&gt;");
    expect(mail.html).toContain("https://app.test/profile");
    expect(r.feedbackAsked).toBe(true);
    expect(r.save).toHaveBeenCalled();
  });

  it("writes the email in the student's language", async () => {
    setup([row({ ...asha, language: "ne" })]);
    await requestFeedback(NOW);
    expect(sendEmail.mock.calls[0][0].html).toContain("कार्यक्रम मूल्यांकन गर्नुहोस्");
  });

  it("skips students who turned event reminders off, but never asks them again", async () => {
    const r = row({ ...asha, eventReminders: false });
    setup([r]);
    const out = await requestFeedback(NOW);
    expect(out.sent).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(pushNotifications).not.toHaveBeenCalled();
    expect(r.feedbackAsked).toBe(true);
  });

  it("handles a deleted account and a failing email without stopping", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const gone = row(null);
    const bad = row(asha);
    const ok = row({ ...asha, _id: "u2", email: "b@patancollege.edu.np" });
    setup([gone, bad, ok]);
    sendEmail.mockRejectedValueOnce(new Error("bounce")).mockResolvedValue();
    const out = await requestFeedback(NOW);
    expect(out).toEqual({ events: 1, sent: 1, failed: 1 });
    expect([gone, bad, ok].every((r) => r.feedbackAsked)).toBe(true);
  });

  it("does nothing when no event is in the window", async () => {
    setup([], []);
    expect(await requestFeedback(NOW)).toEqual({ events: 0, sent: 0, failed: 0 });
    expect(Registration.find).not.toHaveBeenCalled();
  });
});
