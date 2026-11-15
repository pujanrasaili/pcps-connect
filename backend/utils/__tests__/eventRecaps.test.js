process.env.CLIENT_ORIGIN = "https://app.test";
jest.mock("../../models/Event");
jest.mock("../../models/Registration");
jest.mock("../../models/User");
jest.mock("../sendEmail");
jest.mock("../inApp");
jest.mock("../eventOrganisers");

const Event = require("../../models/Event");
const Registration = require("../../models/Registration");
const User = require("../../models/User");
const sendEmail = require("../sendEmail");
const { pushNotifications } = require("../inApp");
const { organiserIds } = require("../eventOrganisers");
const { sendEventRecaps, getRecapWindow, summarise } = require("../eventRecaps");

const NOW = new Date("2030-01-20T12:00:00Z");
const mkEvent = () => ({ _id: "e1", title: "Hack <Night>", recapSent: false, save: jest.fn().mockResolvedValue() });
const reg = (over) => ({ status: "confirmed", attended: false, rating: null, feedback: "", ...over });
const org = (over = {}) => ({ _id: "o1", name: "Org", email: "o@patancollege.edu.np", language: "en", eventReminders: true, ...over });

function setup({ event = mkEvent(), regs, people = [org()] }) {
  Event.find.mockResolvedValue([event]);
  Registration.find.mockReturnValue({ select: jest.fn().mockResolvedValue(regs) });
  organiserIds.mockResolvedValue(people.map((p) => p._id));
  User.find.mockReturnValue({ select: jest.fn().mockResolvedValue(people) });
  sendEmail.mockResolvedValue();
  return event;
}
afterEach(() => jest.resetAllMocks());

describe("summarise", () => {
  it("counts only confirmed students, rounds the rate and keeps at most 3 comments", () => {
    const s = summarise([
      reg({ attended: true, rating: 5, feedback: "Great" }),
      reg({ attended: true, rating: 4, feedback: " Good " }),
      reg({ rating: 3, feedback: "ok" }),
      reg({ attended: true, rating: 5, feedback: "four" }),
      reg({ status: "cancelled", attended: true, rating: 1, feedback: "x" }),
      reg({ status: "pending" }),
    ]);
    expect(s).toMatchObject({ registered: 4, attended: 3, percent: 75, average: "4.3", count: 4 });
    expect(s.comments).toEqual(["Great", "Good", "ok"]);
  });
  it("has no average when nobody rated", () => {
    expect(summarise([reg({})])).toMatchObject({ registered: 1, average: null, count: 0, percent: 0 });
  });
});

describe("getRecapWindow", () => {
  it("is events between 14 days and 3 days old", () => {
    const { start, end } = getRecapWindow(NOW);
    expect(NOW - start).toBe(14 * 86400000);
    expect(NOW - end).toBe(3 * 86400000);
  });
});

describe("sendEventRecaps", () => {
  it("emails and notifies each organiser once, escapes comments, and marks the event", async () => {
    const event = setup({ regs: [reg({ attended: true, rating: 5, feedback: "<b>Loved</b> it" }), reg({})] });
    const out = await sendEventRecaps(NOW);
    expect(out).toEqual({ events: 1, sent: 1, failed: 0 });
    expect(pushNotifications).toHaveBeenCalledWith(["o1"], { type: "event_recap", title: "Recap for Hack <Night>: 1 of 2 attended", link: "/admin/events" });
    const mail = sendEmail.mock.calls[0][0];
    expect(mail.subject).toBe("Recap: how Hack <Night> went");
    expect(mail.html).toContain("1 of 2");
    expect(mail.html).toContain("5.0 / 5");
    expect(mail.html).toContain("&lt;b&gt;Loved&lt;/b&gt; it");
    expect(mail.html).not.toContain("<b>Loved</b>");
    expect(mail.html).toContain("https://app.test/admin/events");
    expect(event.recapSent).toBe(true);
    expect(event.save).toHaveBeenCalled();
  });

  it("uses the organiser's language and says so when nobody rated", async () => {
    setup({ regs: [reg({ attended: true })], people: [org({ language: "ne" })] });
    await sendEventRecaps(NOW);
    expect(sendEmail.mock.calls[0][0].html).toContain("अहिलेसम्म कसैले मूल्यांकन गरेका छैनन्");
  });

  it("skips organisers who turned event reminders off", async () => {
    const event = setup({ regs: [reg({})], people: [org({ eventReminders: false })] });
    const out = await sendEventRecaps(NOW);
    expect(out.sent).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(pushNotifications).not.toHaveBeenCalled();
    expect(event.recapSent).toBe(true);
  });

  it("sends nothing for an event nobody registered for, but does not look at it again", async () => {
    const event = setup({ regs: [] });
    await sendEventRecaps(NOW);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(organiserIds).not.toHaveBeenCalled();
    expect(event.recapSent).toBe(true);
  });

  it("keeps going when one email fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setup({ regs: [reg({})], people: [org(), org({ _id: "o2", email: "p@patancollege.edu.np" })] });
    sendEmail.mockRejectedValueOnce(new Error("bounce")).mockResolvedValue();
    expect(await sendEventRecaps(NOW)).toEqual({ events: 1, sent: 1, failed: 1 });
  });
});
