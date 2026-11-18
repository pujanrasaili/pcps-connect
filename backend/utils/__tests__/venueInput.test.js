const { cleanVenue } = require("../venueInput");

describe("cleanVenue", () => {
  it("tidies the name, builds a lower-case key and keeps the directions", () => {
    expect(cleanVenue({ name: "  Seminar   Hall ", directions: " Block B, 2nd floor " })).toEqual({
      name: "Seminar Hall",
      nameKey: "seminar hall",
      directions: "Block B, 2nd floor",
    });
  });
  it("directions are optional", () => {
    expect(cleanVenue({ name: "Lab 2" }).directions).toBe("");
    expect(cleanVenue({ name: "Lab 2", directions: null }).directions).toBe("");
  });
  it("refuses a missing, short or long name and bad directions", () => {
    expect(cleanVenue({}).error).toBe("A venue needs a name");
    expect(cleanVenue(undefined).error).toBe("A venue needs a name");
    expect(cleanVenue({ name: "a" }).error).toBe("A venue needs a name");
    expect(cleanVenue({ name: "x".repeat(61) }).error).toMatch(/60 characters/);
    expect(cleanVenue({ name: "Hall", directions: 5 }).error).toBe("The directions must be text");
    expect(cleanVenue({ name: "Hall", directions: "x".repeat(201) }).error).toMatch(/200 characters/);
  });
});
