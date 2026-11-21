const { createSignedCode, verifySignedCode } = require("../signedCode");

const ID = "64b7f0c2a1b2c3d4e5f60718";

beforeEach(() => {
  process.env.JWT_SECRET = "test-secret-one";
});

describe("signed codes", () => {
  it("round-trips: a code verifies back to the registration id", () => {
    const code = createSignedCode("checkin", ID);
    expect(code.startsWith(`${ID}.`)).toBe(true);
    expect(verifySignedCode("checkin", code)).toBe(ID);
  });

  it("accepts an object id and surrounding spaces", () => {
    const code = createSignedCode("checkin", { toString: () => ID });
    expect(verifySignedCode("checkin", `  ${code}  `)).toBe(ID);
  });

  it("rejects a code made for a different purpose", () => {
    const code = createSignedCode("checkin", ID);
    expect(verifySignedCode("certificate", code)).toBeNull();
  });

  it("rejects a tampered signature or a swapped registration id", () => {
    const code = createSignedCode("checkin", ID);
    const [id, sig] = code.split(".");
    const flipped = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
    expect(verifySignedCode("checkin", `${id}.${flipped}`)).toBeNull();
    expect(verifySignedCode("checkin", `64b7f0c2a1b2c3d4e5f60719.${sig}`)).toBeNull();
  });

  it("rejects a code signed with a different secret", () => {
    const code = createSignedCode("checkin", ID);
    process.env.JWT_SECRET = "test-secret-two";
    expect(verifySignedCode("checkin", code)).toBeNull();
  });

  it("rejects malformed input without throwing", () => {
    for (const bad of [undefined, null, 42, {}, "", "abc", `${ID}`, `${ID}.`, `${ID}.a.b`, "nothex.abc", `${ID}.short`]) {
      expect(verifySignedCode("checkin", bad)).toBeNull();
    }
  });
});
