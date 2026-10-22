const { cleanNotice, MAX_LENGTH } = require("../siteNotice");

describe("cleanNotice", () => {
  it("accepts a message, trims and collapses whitespace, defaults the tone to info", () => {
    expect(cleanNotice({ message: "  Fest   closes\nFriday  " })).toEqual({ message: "Fest closes Friday", tone: "info" });
  });

  it("keeps a valid tone", () => {
    expect(cleanNotice({ message: "Venue changed", tone: "warning" })).toEqual({ message: "Venue changed", tone: "warning" });
  });

  it("treats a blank or missing message as 'clear the banner'", () => {
    expect(cleanNotice({ message: "   " })).toEqual({ clear: true });
    expect(cleanNotice({})).toEqual({ clear: true });
    expect(cleanNotice(undefined)).toEqual({ clear: true });
  });

  it("rejects non-text messages and unknown tones", () => {
    expect(cleanNotice({ message: { $gt: "" } }).error).toBeTruthy();
    expect(cleanNotice({ message: 42 }).error).toBeTruthy();
    expect(cleanNotice({ message: "hi", tone: "danger" }).error).toBeTruthy();
  });

  it("rejects an over-long message but allows exactly the limit", () => {
    expect(cleanNotice({ message: "x".repeat(MAX_LENGTH) }).message).toHaveLength(MAX_LENGTH);
    expect(cleanNotice({ message: "x".repeat(MAX_LENGTH + 1) }).error).toBeTruthy();
  });
});
