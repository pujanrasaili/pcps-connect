const { cleanSponsors } = require("../sponsors");

describe("cleanSponsors", () => {
  it("trims names, tidies spaces and turns addresses into full https links", () => {
    expect(cleanSponsors([{ name: "  Acme   Ltd ", url: "acme.com.np" }, { name: "Local Cafe" }]).value).toEqual([
      { name: "Acme Ltd", url: "https://acme.com.np/" },
      { name: "Local Cafe", url: "" },
    ]);
  });
  it("keeps http and https links as they are", () => {
    expect(cleanSponsors([{ name: "Ab", url: "http://example.org/x" }]).value[0].url).toBe("http://example.org/x");
  });
  it("never accepts script or file links", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,hi", "ftp://x.com/a", "not a link", "localhost"]) {
      expect(cleanSponsors([{ name: "Ab", url }]).error).toBe("A website address isn't valid");
    }
  });
  it("accepts an empty list (removes the sponsors)", () => {
    expect(cleanSponsors([]).value).toEqual([]);
  });
  it("refuses a non-list, too many, nameless, long and repeated sponsors", () => {
    expect(cleanSponsors("x").error).toBe("Sponsors must be a list");
    expect(cleanSponsors(Array.from({ length: 7 }, (_, i) => ({ name: `Name ${i}` }))).error).toMatch(/at most 6/);
    expect(cleanSponsors([{ name: " " }]).error).toBe("Each sponsor needs a name");
    expect(cleanSponsors([null]).error).toBe("Each sponsor needs a name");
    expect(cleanSponsors([{ name: "x".repeat(61) }]).error).toMatch(/60 characters/);
    expect(cleanSponsors([{ name: "Ab", url: `https://a.com/${"x".repeat(200)}` }]).error).toMatch(/200 characters/);
    expect(cleanSponsors([{ name: "Acme" }, { name: "acme" }]).error).toBe("Two sponsors can't be the same");
  });
});
