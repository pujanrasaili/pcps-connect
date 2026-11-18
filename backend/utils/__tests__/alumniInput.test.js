const { cleanAlumniInput } = require("../alumniInput");

const NOW = new Date("2026-11-18T00:00:00Z");

describe("cleanAlumniInput", () => {
  it("accepts nothing at all (year and note are optional)", () => {
    expect(cleanAlumniInput({}, NOW)).toEqual({ year: undefined, note: "" });
    expect(cleanAlumniInput(undefined, NOW)).toEqual({ year: undefined, note: "" });
    expect(cleanAlumniInput({ year: "", note: null }, NOW)).toEqual({ year: undefined, note: "" });
  });
  it("reads the year from a number or a string and tidies the note", () => {
    expect(cleanAlumniInput({ year: "2024", note: "  President   2024 " }, NOW)).toEqual({ year: 2024, note: "President 2024" });
    expect(cleanAlumniInput({ year: 2027 }, NOW).year).toBe(2027);
  });
  it("refuses a year out of range or not whole", () => {
    for (const year of [1999, 2028, 2024.5, "abc"]) {
      expect(cleanAlumniInput({ year }, NOW).error).toMatch(/between 2000 and 2027/);
    }
  });
  it("refuses a note that is not text or is over 80 characters", () => {
    expect(cleanAlumniInput({ note: 5 }, NOW).error).toBe("The note must be text");
    expect(cleanAlumniInput({ note: "x".repeat(81) }, NOW).error).toMatch(/80 characters/);
  });
});
