process.env.JWT_SECRET = "test-secret";

const { createCertificateCode, verifyCertificateCode } = require("../certificateCode");
const { createCheckInCode, verifyCheckInCode } = require("../checkInCode");

const ID = "a1b2c3d4e5f6a1b2c3d4e5f6";

describe("certificate codes", () => {
  it("round-trips", () => {
    expect(verifyCertificateCode(createCertificateCode(ID))).toBe(ID);
  });

  it("is not interchangeable with a check-in code (in either direction)", () => {
    expect(verifyCertificateCode(createCheckInCode(ID))).toBeNull();
    expect(verifyCheckInCode(createCertificateCode(ID))).toBeNull();
  });

  it("rejects tampering and junk", () => {
    const code = createCertificateCode(ID);
    expect(verifyCertificateCode(code.slice(0, -1) + (code.endsWith("A") ? "B" : "A"))).toBeNull();
    expect(verifyCertificateCode(`${"b".repeat(24)}.${code.split(".")[1]}`)).toBeNull();
    expect(verifyCertificateCode(undefined)).toBeNull();
    expect(verifyCertificateCode("x")).toBeNull();
  });
});
