process.env.JWT_SECRET = "test-secret";

const { createCheckInCode, verifyCheckInCode } = require("../checkInCode");

const ID = "a1b2c3d4e5f6a1b2c3d4e5f6";

describe("check-in codes", () => {
  it("round-trips: a code we issued verifies back to its registration id", () => {
    expect(verifyCheckInCode(createCheckInCode(ID))).toBe(ID);
  });

  it("is deterministic for the same registration", () => {
    expect(createCheckInCode(ID)).toBe(createCheckInCode(ID));
  });

  it("gives different registrations different codes", () => {
    expect(createCheckInCode(ID)).not.toBe(createCheckInCode("b".repeat(24)));
  });

  it("rejects a code whose id was swapped for another registration's", () => {
    const [, signature] = createCheckInCode(ID).split(".");
    expect(verifyCheckInCode(`${"b".repeat(24)}.${signature}`)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const code = createCheckInCode(ID);
    expect(verifyCheckInCode(code.slice(0, -1) + (code.endsWith("A") ? "B" : "A"))).toBeNull();
  });

  it("rejects a code made with a different secret", () => {
    const code = createCheckInCode(ID);
    process.env.JWT_SECRET = "another-secret";
    expect(verifyCheckInCode(code)).toBeNull();
    process.env.JWT_SECRET = "test-secret";
  });

  it.each([[undefined], [null], [""], ["nodot"], ["a.b.c"], [123], [{}], [`${ID}.`], [`not-an-id.sig`]])(
    "rejects malformed input %p",
    (input) => {
      expect(verifyCheckInCode(input)).toBeNull();
    }
  );

  it("tolerates surrounding whitespace (e.g. pasted codes)", () => {
    expect(verifyCheckInCode(`  ${createCheckInCode(ID)}\n`)).toBe(ID);
  });
});
