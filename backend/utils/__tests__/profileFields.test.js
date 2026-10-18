const { cleanProfileFields, LIMITS } = require("../profileFields");

describe("cleanProfileFields", () => {
  it("returns only the supplied fields, trimmed", () => {
    const { values, error } = cleanProfileFields({ name: "  Sita Rai ", phone: " 9800000000 " });
    expect(error).toBeUndefined();
    expect(values).toEqual({ name: "Sita Rai", phone: "9800000000" });
  });

  it("ignores fields it doesn't know about (role, approvalStatus, email...)", () => {
    const { values } = cleanProfileFields({ name: "Sita", role: "admin", approvalStatus: "approved", email: "x@y.z" });
    expect(values).toEqual({ name: "Sita" });
  });

  it("treats null/undefined as not supplied", () => {
    expect(cleanProfileFields({ name: null, program: undefined }).values).toEqual({});
    expect(cleanProfileFields().values).toEqual({});
  });

  it("allows clearing optional text fields with an empty string", () => {
    expect(cleanProfileFields({ phone: "" }).values).toEqual({ phone: "" });
  });

  it("rejects an empty or whitespace-only name", () => {
    expect(cleanProfileFields({ name: "   " }).error).toMatch(/name/i);
  });

  it.each(Object.keys(LIMITS))("rejects %s over its length limit but accepts exactly the limit", (field) => {
    expect(cleanProfileFields({ [field]: "a".repeat(LIMITS[field]) }).error).toBeUndefined();
    expect(cleanProfileFields({ [field]: "a".repeat(LIMITS[field] + 1) }).error).toMatch(/characters or fewer/);
  });

  it.each([[123], [{ a: 1 }], [["x"]], [true]])("rejects non-text value %p for a text field", (value) => {
    expect(cleanProfileFields({ program: value }).error).toMatch(/must be text/);
  });

  describe("avatar", () => {
    it("accepts an https link or empty", () => {
      expect(cleanProfileFields({ avatar: "https://res.cloudinary.com/x/a.png" }).values.avatar).toBe("https://res.cloudinary.com/x/a.png");
      expect(cleanProfileFields({ avatar: "" }).values.avatar).toBe("");
    });
    it.each([["http://example.com/a.png"], ["javascript:alert(1)"], ["data:image/png;base64,AAAA"], ["https://a b.com"], ["//evil.com/a.png"]])(
      "rejects %s",
      (avatar) => expect(cleanProfileFields({ avatar }).error).toMatch(/Avatar/)
    );
    it("rejects an over-long link", () => {
      expect(cleanProfileFields({ avatar: "https://x.com/" + "a".repeat(500) }).error).toMatch(/Avatar/);
    });
    it("rejects a non-string", () => {
      expect(cleanProfileFields({ avatar: { url: "x" } }).error).toMatch(/Avatar/);
    });
  });

  describe("notification flags", () => {
    it("accepts booleans", () => {
      expect(cleanProfileFields({ eventReminders: false, clubUpdates: true }).values).toEqual({ eventReminders: false, clubUpdates: true });
    });
    it.each([["false"], [0], ["yes"], [{}]])("rejects %p", (v) => {
      expect(cleanProfileFields({ clubUpdates: v }).error).toMatch(/true or false/);
    });
  });
});
