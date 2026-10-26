const { emailProvider } = require("../emailProvider");

describe("emailProvider", () => {
  it("prefers Brevo when its key is set", () => {
    expect(emailProvider({ BREVO_API_KEY: "k", EMAIL_USER: "a@x.com", EMAIL_APP_PASSWORD: "p" })).toBe("brevo");
  });
  it("falls back to Gmail SMTP when both Gmail settings exist", () => {
    expect(emailProvider({ EMAIL_USER: "a@x.com", EMAIL_APP_PASSWORD: "p" })).toBe("gmail-smtp");
  });
  it("reports not-configured otherwise", () => {
    expect(emailProvider({})).toBe("not-configured");
    expect(emailProvider({ EMAIL_USER: "a@x.com" })).toBe("not-configured");
  });
});
