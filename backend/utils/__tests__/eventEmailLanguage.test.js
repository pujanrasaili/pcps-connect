jest.mock("../sendEmail");
jest.mock("../../models/Registration");
jest.mock("../inApp");

const sendEmail = require("../sendEmail");
const Registration = require("../../models/Registration");
const { sendRegistrationConfirmation, sendRequestReceived, sendRequestDeclined } = require("../registrationEmails");
const { notifyEventCancelled, notifyEventAnnouncement, notifyEventRescheduled } = require("../notifyRegistrants");
const { formatEventDate } = require("../formatEventDate");
const { eventEmail } = require("../eventEmailText");

const event = {
  _id: "e1",
  title: "Hack <Night>",
  date: new Date("2026-11-10T04:55:00Z"),
  location: "Room 5 & lab",
};
const DEVANAGARI = /[ऀ-ॿ]/;

beforeEach(() => {
  sendEmail.mockReset();
  sendEmail.mockResolvedValue();
});

describe("event emails follow the student's language", () => {
  it.each([
    ["confirmation", sendRegistrationConfirmation],
    ["received", sendRequestReceived],
    ["declined", sendRequestDeclined],
  ])("%s is Nepali for ne and English otherwise", async (_n, send) => {
    await send({ name: "Sita", email: "s@x.com", language: "ne" }, event);
    await send({ name: "Sita", email: "s@x.com", language: "en" }, event);
    await send({ name: "Sita", email: "s@x.com" }, event);
    const [ne, en, none] = sendEmail.mock.calls.map((c) => c[0]);
    expect(ne.subject).toMatch(DEVANAGARI);
    expect(ne.html).toContain('lang="ne"');
    expect(en.subject).not.toMatch(DEVANAGARI);
    expect(none.subject).toBe(en.subject);
  });

  it("escapes the title and keeps it in the Nepali subject", async () => {
    await sendRegistrationConfirmation({ name: "<b>S</b>", email: "s@x.com", language: "ne" }, event);
    const m = sendEmail.mock.calls[0][0];
    expect(m.subject).toContain("Hack <Night>");
    expect(m.html).toContain("Hack &lt;Night&gt;");
    expect(m.html).not.toContain("<b>S</b>");
  });

  it("formats the date with Nepali weekday and month names", () => {
    const plain = (t) => t.replace(/\s/g, " "); // newer ICU uses a narrow no-break space before AM
    expect(plain(formatEventDate(event.date, "ne"))).toBe("मङ्गल, नोभे 10, 2026, 10:40 AM (नेपाल समय)");
    expect(plain(formatEventDate(event.date))).toBe("Tue, Nov 10, 2026, 10:40 AM (Nepal time)");
  });

  it("every English template has a Nepali one", () => {
    const vars = { name: "N", title: "T", rawTitle: "T", when: "W", where: "P", messageHtml: "M", oldWhen: "o", oldWhere: "o", dateChanged: true, locationChanged: true };
    for (const kind of ["confirmed", "requestReceived", "requestDeclined", "spotOpened", "rescheduled", "cancelled", "announcement"]) {
      const ne = eventEmail(kind, "ne", vars);
      const en = eventEmail(kind, "en", vars);
      expect(ne.heading).toMatch(DEVANAGARI);
      expect(ne.bodyHtml).toMatch(DEVANAGARI);
      expect(en.bodyHtml).not.toMatch(DEVANAGARI);
    }
  });
});

describe("notifying registrants sends each person their own language", () => {
  const rows = [
    { user: { _id: "u1", name: "Sita", email: "a@x.com", language: "ne" } },
    { user: { _id: "u2", name: "Ram", email: "b@x.com", language: "en" } },
  ];
  beforeEach(() => {
    Registration.find.mockReturnValue({ populate: jest.fn().mockResolvedValue(rows) });
  });

  it("cancelled", async () => {
    await notifyEventCancelled(event);
    const byTo = Object.fromEntries(sendEmail.mock.calls.map((c) => [c[0].to, c[0]]));
    expect(byTo["a@x.com"].subject).toMatch(DEVANAGARI);
    expect(byTo["b@x.com"].subject).toBe("Event cancelled: Hack <Night>");
  });

  it("announcement keeps the admin message escaped in both", async () => {
    await notifyEventAnnouncement(event, "Bring <i>ID</i>\nthanks");
    for (const [{ html }] of sendEmail.mock.calls) {
      expect(html).toContain("Bring &lt;i&gt;ID&lt;/i&gt;<br>thanks");
    }
    expect(sendEmail.mock.calls.find((c) => c[0].to === "a@x.com")[0].html).toContain('lang="ne"');
  });

  it("rescheduled shows old and new in the right language", async () => {
    await notifyEventRescheduled(event, { oldDate: new Date("2026-11-09T04:55:00Z"), oldLocation: "Hall" });
    const ne = sendEmail.mock.calls.find((c) => c[0].to === "a@x.com")[0];
    const en = sendEmail.mock.calls.find((c) => c[0].to === "b@x.com")[0];
    expect(ne.html).toContain("नयाँ मिति/समय:");
    expect(ne.html).toContain("नयाँ स्थान:");
    expect(en.html).toContain("New date/time:");
    expect(en.html).toContain("(was Hall)");
  });
});
