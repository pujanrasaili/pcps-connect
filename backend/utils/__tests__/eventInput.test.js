const { validateEventFields, LIMITS, MAX_CAPACITY } = require("../eventInput");

const good = { title: "Hack Night", description: "Build things", date: "2027-01-15T10:00", location: "Lab 2", capacity: "50", category: "Tech", price: "Free" };

describe("validateEventFields", () => {
  it("accepts a normal event, and an edit that sends only some fields", () => {
    expect(validateEventFields(good)).toBeNull();
    expect(validateEventFields({ location: "Hall" })).toBeNull();
    expect(validateEventFields({})).toBeNull();
    expect(validateEventFields()).toBeNull();
  });

  it("rejects a date that isn't a date, instead of letting the database fail with a 500", () => {
    expect(validateEventFields({ ...good, date: "banana" })).toBe("Enter a valid date and time");
    expect(validateEventFields({ ...good, date: "" })).toBe("Enter a valid date and time");
    expect(validateEventFields({ ...good, date: { $gt: "" } })).toBe("Enter a valid date and time");
  });

  it("accepts ISO strings and Date objects", () => {
    expect(validateEventFields({ date: "2027-01-15T10:00:00.000Z" })).toBeNull();
    expect(validateEventFields({ date: new Date() })).toBeNull();
  });

  it("rejects non-text fields (arrays and objects can't be titles)", () => {
    expect(validateEventFields({ ...good, title: ["a"] })).toBe("Title must be text");
    expect(validateEventFields({ ...good, price: { x: 1 } })).toBe("Price must be text");
  });

  it("rejects blank required text when it is sent", () => {
    expect(validateEventFields({ title: "   " })).toBe("Title can't be empty");
    expect(validateEventFields({ description: "" })).toBe("Description can't be empty");
    expect(validateEventFields({ location: " " })).toBe("Location can't be empty");
    // category and price may be blank (they fall back to defaults)
    expect(validateEventFields({ category: "" })).toBeNull();
  });

  it("enforces a length limit on every text field", () => {
    for (const [field, max] of Object.entries(LIMITS)) {
      expect(validateEventFields({ [field]: "x".repeat(max) })).toBeNull();
      expect(validateEventFields({ [field]: "x".repeat(max + 1) })).toMatch(new RegExp(`${max} characters or fewer`));
    }
  });

  it("caps capacity, leaving the 'not a whole number' message to the existing check", () => {
    expect(validateEventFields({ capacity: MAX_CAPACITY })).toBeNull();
    expect(validateEventFields({ capacity: MAX_CAPACITY + 1 })).toMatch(/can't be more than 100,000/);
    expect(validateEventFields({ capacity: "1e12" })).toMatch(/can't be more than/);
    expect(validateEventFields({ capacity: "abc" })).toBeNull();
    expect(validateEventFields({ capacity: "" })).toBeNull();
  });
});
