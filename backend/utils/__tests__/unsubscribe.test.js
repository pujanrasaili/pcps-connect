const { appOrigin, settingsUrl, unsubscribeHeaders, settingsLink } = require("../unsubscribe");

describe("unsubscribe helpers", () => {
  it("uses CLIENT_ORIGIN, trimming a trailing slash, with the live site as the fallback", () => {
    expect(appOrigin({ CLIENT_ORIGIN: "https://app.test/" })).toBe("https://app.test");
    expect(appOrigin({})).toBe("https://pcps-connect.vercel.app");
  });

  it("points opt-out at the Settings page", () => {
    expect(settingsUrl("https://app.test")).toBe("https://app.test/settings");
  });

  it("builds the List-Unsubscribe header Gmail and Outlook read", () => {
    expect(unsubscribeHeaders("https://app.test")).toEqual({ "List-Unsubscribe": "<https://app.test/settings>" });
  });

  it("builds an inline Settings link for email footers", () => {
    expect(settingsLink("https://app.test")).toContain('href="https://app.test/settings"');
    expect(settingsLink("https://app.test")).toContain(">Settings</a>");
  });
});
