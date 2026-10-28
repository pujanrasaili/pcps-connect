const { parseAddress, buildBrevoPayload, sendViaBrevo } = require("../brevoMail");

describe("parseAddress", () => {
  it("splits a display name from the address", () => {
    expect(parseAddress('"PCPS Connect" <club@gmail.com>')).toEqual({ name: "PCPS Connect", email: "club@gmail.com" });
  });
  it("accepts a bare address", () => {
    expect(parseAddress("sita@patancollege.edu.np")).toEqual({ email: "sita@patancollege.edu.np" });
  });
});

describe("buildBrevoPayload", () => {
  const mail = { from: '"PCPS Connect" <club@gmail.com>', to: "sita@patancollege.edu.np", subject: "Hi", html: "<p>Hi</p>", text: "Hi" };

  it("maps the usual fields", () => {
    expect(buildBrevoPayload(mail)).toEqual({
      sender: { email: "club@gmail.com", name: "PCPS Connect" },
      to: [{ email: "sita@patancollege.edu.np" }],
      subject: "Hi",
      htmlContent: "<p>Hi</p>",
      textContent: "Hi",
    });
  });

  it("uses the verified sender address when one is configured", () => {
    expect(buildBrevoPayload(mail, { senderEmail: "verified@x.np" }).sender).toEqual({ email: "verified@x.np", name: "PCPS Connect" });
  });

  it("carries reply-to, headers and several recipients", () => {
    const p = buildBrevoPayload({ ...mail, to: ["a@x.np", "b@x.np"], replyTo: "me@x.np", headers: { "List-Unsubscribe": "<https://a.test>" } });
    expect(p.to).toEqual([{ email: "a@x.np" }, { email: "b@x.np" }]);
    expect(p.replyTo).toEqual({ email: "me@x.np" });
    expect(p.headers).toEqual({ "List-Unsubscribe": "<https://a.test>" });
  });

  it("attaches a calendar invite as base64", () => {
    const p = buildBrevoPayload({ ...mail, icalEvent: { method: "PUBLISH", content: "BEGIN:VCALENDAR" } });
    expect(p.attachment).toEqual([{ name: "invite.ics", content: Buffer.from("BEGIN:VCALENDAR").toString("base64") }]);
  });
});

describe("sendViaBrevo", () => {
  const mail = { from: "club@gmail.com", to: "a@x.np", subject: "S", html: "<p>x</p>" };

  it("posts to Brevo with the API key", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ messageId: "1" }) });
    const result = await sendViaBrevo(mail, { apiKey: "key123", fetchImpl });
    expect(result).toEqual({ messageId: "1" });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.headers["api-key"]).toBe("key123");
    expect(JSON.parse(init.body).to).toEqual([{ email: "a@x.np" }]);
  });

  it("throws with Brevo's reason when it refuses", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ message: "Sender is not valid" }) });
    await expect(sendViaBrevo(mail, { apiKey: "k", fetchImpl })).rejects.toThrow("Brevo rejected the email (400): Sender is not valid");
  });

  it("still throws a useful error when the reply isn't JSON", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error("bad json"); } });
    await expect(sendViaBrevo(mail, { apiKey: "k", fetchImpl })).rejects.toThrow("Brevo rejected the email (502)");
  });

  it("refuses to try without an API key", async () => {
    await expect(sendViaBrevo(mail, { fetchImpl: jest.fn() })).rejects.toThrow("BREVO_API_KEY");
  });

  it("gives up with a clear message instead of waiting forever", async () => {
    const err = Object.assign(new Error("timed out"), { name: "TimeoutError" });
    const fetchImpl = jest.fn().mockRejectedValue(err);
    await expect(sendViaBrevo(mail, { apiKey: "k", fetchImpl, timeoutMs: 5000 })).rejects.toThrow("Brevo did not answer within 5 seconds");
  });

  it("sends a timeout signal with the request", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    await sendViaBrevo(mail, { apiKey: "k", fetchImpl });
    expect(fetchImpl.mock.calls[0][1].signal).toBeDefined();
  });
});
