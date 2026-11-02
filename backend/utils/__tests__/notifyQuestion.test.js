jest.mock("../sendEmail");
jest.mock("../inApp");

const sendEmail = require("../sendEmail");
const { pushNotifications } = require("../inApp");
const { notifyOrganiserOfQuestion, notifyAskerOfAnswer } = require("../notifyQuestion");

const event = { _id: "e1", title: "Hack <Night>" };

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => {
  jest.restoreAllMocks();
  jest.resetAllMocks();
});

describe("notifyOrganiserOfQuestion", () => {
  it("emails the organiser the question, with the student's text and the event title escaped", async () => {
    sendEmail.mockResolvedValue();
    await notifyOrganiserOfQuestion({ email: "o@x.np" }, event, "Is <b>food</b> provided?", "Asha <i>");
    const mail = sendEmail.mock.calls[0][0];
    expect(mail.to).toBe("o@x.np");
    expect(mail.subject).toBe("New question on Hack <Night>");
    expect(mail.html).toContain("Hack &lt;Night&gt;");
    expect(mail.html).toContain("Is &lt;b&gt;food&lt;/b&gt; provided?");
    expect(mail.html).toContain("Asha &lt;i&gt;");
    expect(mail.html).not.toContain("<b>food");
    expect(mail.html).toContain("/events/e1");
  });

  it("does nothing when the organiser has no email, and never throws when sending fails", async () => {
    await notifyOrganiserOfQuestion(null, event, "q", "Asha");
    await notifyOrganiserOfQuestion({}, event, "q", "Asha");
    expect(sendEmail).not.toHaveBeenCalled();
    sendEmail.mockRejectedValue(new Error("smtp down"));
    await expect(notifyOrganiserOfQuestion({ email: "o@x.np" }, event, "q", "Asha")).resolves.toBeUndefined();
  });
});

describe("notifyAskerOfAnswer", () => {
  const asker = { _id: "s1", name: "Asha <b>", email: "a@x.np" };

  it("sends a bell message and an email with the question and the answer, escaped", async () => {
    sendEmail.mockResolvedValue();
    await notifyAskerOfAnswer(asker, event, "When?", "At <5pm>");
    expect(pushNotifications).toHaveBeenCalledWith(["s1"], { type: "question_answered", title: "Your question about Hack <Night> was answered", link: "/events/e1" });
    const mail = sendEmail.mock.calls[0][0];
    expect(mail.to).toBe("a@x.np");
    expect(mail.html).toContain("At &lt;5pm&gt;");
    expect(mail.html).toContain("Asha &lt;b&gt;");
    expect(mail.html).not.toContain("<b>");
  });

  it("still rings the bell when there is no email, and a failed email never throws", async () => {
    await notifyAskerOfAnswer({ _id: "s1", name: "A" }, event, "q", "a");
    expect(pushNotifications).toHaveBeenCalledTimes(1);
    expect(sendEmail).not.toHaveBeenCalled();
    sendEmail.mockRejectedValue(new Error("bounce"));
    await expect(notifyAskerOfAnswer(asker, event, "q", "a")).resolves.toBeUndefined();
  });
});
