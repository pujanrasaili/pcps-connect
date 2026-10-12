const { safeError } = require("../errorMessage");

describe("safeError", () => {
  const originalEnv = process.env.NODE_ENV;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    consoleErrorSpy.mockRestore();
  });

  it("returns the real error message outside production", () => {
    process.env.NODE_ENV = "development";
    const err = new Error("Cast to ObjectId failed for value \"xyz\" at path \"_id\"");
    expect(safeError(err, "Failed to fetch user")).toBe(err.message);
  });

  it("hides the real error message and returns the fallback in production", () => {
    process.env.NODE_ENV = "production";
    const err = new Error("MongoNetworkError: connect ECONNREFUSED 10.0.0.5:27017");
    expect(safeError(err, "Failed to fetch user")).toBe("Failed to fetch user");
  });

  it("always logs the real error server-side, even when hiding it from the client", () => {
    process.env.NODE_ENV = "production";
    const err = new Error("some internal detail");
    safeError(err, "fallback");
    expect(consoleErrorSpy).toHaveBeenCalledWith(err);
  });

  it("falls back gracefully when the error has no message", () => {
    process.env.NODE_ENV = "development";
    expect(safeError({}, "fallback")).toBe("fallback");
    expect(safeError(null, "fallback")).toBe("fallback");
  });
});
