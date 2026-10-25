const { clientRequestError } = require("../requestErrors");

describe("clientRequestError", () => {
  it("answers invalid JSON with 400", () => {
    expect(clientRequestError({ type: "entity.parse.failed" })).toEqual({ status: 400, message: "The request body is not valid JSON" });
  });
  it("answers an oversized body with 413", () => {
    expect(clientRequestError({ type: "entity.too.large" })).toEqual({ status: 413, message: "The request is too large" });
  });
  it("leaves every other error alone", () => {
    expect(clientRequestError(new Error("db down"))).toBeNull();
    expect(clientRequestError(undefined)).toBeNull();
  });
});
