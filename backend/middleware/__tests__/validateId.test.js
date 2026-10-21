const { isObjectId, validateIdParam } = require("../validateId");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("isObjectId", () => {
  it("accepts 24 hex characters only", () => {
    expect(isObjectId("64b7f0c2a1b2c3d4e5f60718")).toBe(true);
    expect(isObjectId("64B7F0C2A1B2C3D4E5F60718")).toBe(true);
    expect(isObjectId("abc")).toBe(false);
    expect(isObjectId("undefined")).toBe(false);
    expect(isObjectId("123456789012")).toBe(false); // 12 chars: mongoose would accept, we don't
    expect(isObjectId("64b7f0c2a1b2c3d4e5f6071z")).toBe(false);
    expect(isObjectId({ $gt: "" })).toBe(false);
    expect(isObjectId(undefined)).toBe(false);
  });
});

describe("validateIdParam", () => {
  it("lets a real id through", () => {
    const next = jest.fn();
    const res = mockRes();
    validateIdParam({}, res, next, "64b7f0c2a1b2c3d4e5f60718");
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("answers 404 for a malformed id and never reaches the route", () => {
    const next = jest.fn();
    const res = mockRes();
    validateIdParam({}, res, next, "not-an-id");
    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });
});
