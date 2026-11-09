jest.mock("../../models/EventVolunteer");
jest.mock("../sendEmail");
jest.mock("../inApp");

const EventVolunteer = require("../../models/EventVolunteer");
const sendEmail = require("../sendEmail");
const { pushNotifications } = require("../inApp");
const { remindVolunteers } = require("../volunteerReminders");
const { volunteerReminderEmail } = require("../reminderEmailText");

const event = { _id: "e1", title: "Fest <1>", date: new Date("2026-11-10T04:55:00Z"), location: "Hall", volunteerRoles: [{ _id: "r1", name: "Desk" }] };
const row = (user, extra = {}) => ({ role: "r1", user, reminderSent: false, save: jest.fn().mockResolvedValue(), ...extra });
const populated = (rows) => ({ populate: () => Promise.resolve(rows) });

afterEach(() => jest.resetAllMocks());

describe("remindVolunteers", () => {
  it("emails and notifies a helper, then marks the sign-up handled", async () => {
    const r = row({ _id: "u1", name: "Sita", email: "s@x.np", eventReminders: true, language: "en" });
    EventVolunteer.find.mockReturnValue(populated([r]));
    sendEmail.mockResolvedValue();
    expect(await remindVolunteers(event)).toEqual({ sent: 1, failed: 0 });
    expect(EventVolunteer.find).toHaveBeenCalledWith({ event: "e1", reminderSent: false });
    expect(sendEmail.mock.calls[0][0].to).toBe("s@x.np");
    expect(sendEmail.mock.calls[0][0].subject).toBe("Reminder: you're helping at Fest <1>");
    expect(sendEmail.mock.calls[0][0].html).toContain("Fest &lt;1&gt;");
    expect(pushNotifications.mock.calls[0][1].title).toContain("(Desk)");
    expect(r.reminderSent).toBe(true);
    expect(r.save).toHaveBeenCalled();
  });
  it("skips (but still marks) a deleted account and a student who turned reminders off", async () => {
    const gone = row(null);
    const off = row({ _id: "u2", name: "Ram", email: "r@x.np", eventReminders: false });
    EventVolunteer.find.mockReturnValue(populated([gone, off]));
    expect(await remindVolunteers(event)).toEqual({ sent: 0, failed: 0 });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(pushNotifications).not.toHaveBeenCalled();
    expect(gone.reminderSent && off.reminderSent).toBe(true);
  });
  it("counts a failed send and does not retry it tomorrow", async () => {
    const r = row({ _id: "u1", name: "Sita", email: "bad@x.np" });
    EventVolunteer.find.mockReturnValue(populated([r]));
    sendEmail.mockRejectedValue(new Error("bounce"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect(await remindVolunteers(event)).toEqual({ sent: 0, failed: 1 });
    expect(r.reminderSent).toBe(true);
  });
  it("writes Nepali for a Nepali student", () => {
    const mail = volunteerReminderEmail("ne", { name: "सीता", title: "T", rawTitle: "T", role: "डेस्क", when: "w", where: "h", settings: "s" });
    expect(mail.subject).toMatch(/[ऀ-ॿ]/);
    expect(mail.bodyHtml).toContain("डेस्क");
  });
});
