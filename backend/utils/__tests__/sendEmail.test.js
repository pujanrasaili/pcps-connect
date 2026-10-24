jest.mock("../../config/email", () => ({ sendMail: jest.fn().mockResolvedValue({}) }));
const transporter = require("../../config/email");
const sendEmail = require("../sendEmail");

afterEach(() => jest.clearAllMocks());

describe("sendEmail", () => {
  it("adds a plain-text alternative made from the HTML", async () => {
    await sendEmail({ to: "s@x.test", subject: "Hi", html: '<p>Open <a href="https://a.test/x">the page</a></p>' });
    const sent = transporter.sendMail.mock.calls[0][0];
    expect(sent.html).toContain("<p>");
    expect(sent.text).toBe("Open the page (https://a.test/x)");
  });

  it("keeps a plain-text body the caller supplied", async () => {
    await sendEmail({ to: "s@x.test", subject: "Hi", html: "<p>Hi</p>", text: "Custom text" });
    expect(transporter.sendMail.mock.calls[0][0].text).toBe("Custom text");
  });

  it("still passes reply-to and the calendar card through", async () => {
    await sendEmail({ to: "s@x.test", subject: "Hi", html: "<p>Hi</p>", replyTo: "a@x.test", icalEvent: "BEGIN:VCALENDAR" });
    const sent = transporter.sendMail.mock.calls[0][0];
    expect(sent.replyTo).toBe("a@x.test");
    expect(sent.icalEvent).toEqual({ method: "PUBLISH", content: "BEGIN:VCALENDAR" });
  });

  it("passes custom headers (like List-Unsubscribe) through", async () => {
    await sendEmail({ to: "s@x.test", subject: "Hi", html: "<p>Hi</p>", headers: { "List-Unsubscribe": "<https://a.test/settings>" } });
    expect(transporter.sendMail.mock.calls[0][0].headers).toEqual({ "List-Unsubscribe": "<https://a.test/settings>" });
  });

  it("sends no headers field when none were given", async () => {
    await sendEmail({ to: "s@x.test", subject: "Hi", html: "<p>Hi</p>" });
    expect(transporter.sendMail.mock.calls[0][0]).not.toHaveProperty("headers");
  });
});
