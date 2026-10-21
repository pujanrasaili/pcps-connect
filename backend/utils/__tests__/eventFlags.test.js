const { parseFlag } = require("../eventFlags");

describe("parseFlag", () => {
  it("reads checkbox strings from multipart forms", () => {
    expect(parseFlag("true")).toBe(true);
    expect(parseFlag("on")).toBe(true);
    expect(parseFlag("1")).toBe(true);
    expect(parseFlag("false")).toBe(false);
    expect(parseFlag("")).toBe(false);
  });
  it("passes real booleans through", () => {
    expect(parseFlag(true)).toBe(true);
    expect(parseFlag(false)).toBe(false);
  });
  it("returns undefined when the field wasn't sent or is unrecognisable, so edits leave it alone", () => {
    expect(parseFlag(undefined)).toBeUndefined();
    expect(parseFlag(null)).toBeUndefined();
    expect(parseFlag("maybe")).toBeUndefined();
  });
});
