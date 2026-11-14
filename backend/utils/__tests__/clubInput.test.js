const { validateClubFields } = require("../clubInput");

describe("validateClubFields", () => {
  const ok = { name: "Coding Club", category: "Technology", description: "We code", activities: ["Hack night"] };

  it("accepts a normal club and an empty/partial body", () => {
    expect(validateClubFields(ok)).toBeNull();
    expect(validateClubFields({})).toBeNull();
    expect(validateClubFields({ foundedYear: 2019, image: null })).toBeNull();
  });

  it("rejects blank required text", () => {
    expect(validateClubFields({ name: "   " })).toBe("Club name can't be empty");
    expect(validateClubFields({ category: "" })).toBe("Category can't be empty");
    expect(validateClubFields({ description: null })).toBe("Short description must be text");
  });

  it("rejects non-text and over-long fields", () => {
    expect(validateClubFields({ name: { $gt: "" } })).toBe("Club name must be text");
    expect(validateClubFields({ name: "x".repeat(101) })).toBe("Club name must be 100 characters or fewer");
    expect(validateClubFields({ longDescription: "x".repeat(5001) })).toMatch(/5000 characters/);
  });

  it("checks the activities list", () => {
    expect(validateClubFields({ activities: "a\nb" })).toBe("Activities must be a list of text lines");
    expect(validateClubFields({ activities: [1] })).toBe("Activities must be a list of text lines");
    expect(validateClubFields({ activities: Array(31).fill("a") })).toBe("Add at most 30 activities");
    expect(validateClubFields({ activities: ["x".repeat(201)] })).toMatch(/200 characters/);
  });
});

describe("requiresApproval", () => {
  const { validateClubFields } = require("../clubInput");
  it("must be true or false when sent", () => {
    expect(validateClubFields({ requiresApproval: true })).toBeNull();
    expect(validateClubFields({ requiresApproval: false })).toBeNull();
    expect(validateClubFields({ requiresApproval: "yes" })).toBe("Members need approval must be true or false");
    expect(validateClubFields({ requiresApproval: { $ne: 1 } })).toBe("Members need approval must be true or false");
  });
});

describe("meetings", () => {
  it("accepts a short line of text and an empty one", () => {
    expect(validateClubFields({ meetings: "Thursdays 3 PM, Room 204" })).toBeNull();
    expect(validateClubFields({ meetings: "" })).toBeNull();
  });
  it("rejects non-text and anything over 120 characters", () => {
    expect(validateClubFields({ meetings: 5 })).toMatch(/Regular meetings must be text/);
    expect(validateClubFields({ meetings: "x".repeat(121) })).toMatch(/120 characters/);
  });
  it("is one of the fields an admin form may set", () => {
    const { pickClubFields } = require("../clubFields");
    expect(pickClubFields({ meetings: "Fridays", leaders: ["x"] })).toEqual({ meetings: "Fridays" });
  });
});
