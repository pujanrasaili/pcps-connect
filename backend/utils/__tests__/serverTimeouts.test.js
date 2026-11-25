const { applyServerTimeouts, KEEP_ALIVE_MS } = require("../serverTimeouts");

describe("applyServerTimeouts", () => {
  it("keeps idle connections longer than the hosting proxy does", () => {
    const server = applyServerTimeouts({});
    expect(server.keepAliveTimeout).toBe(KEEP_ALIVE_MS);
    expect(server.keepAliveTimeout).toBeGreaterThan(60000);
  });

  it("keeps headersTimeout above keepAliveTimeout", () => {
    const server = applyServerTimeouts({});
    expect(server.headersTimeout).toBeGreaterThan(server.keepAliveTimeout);
  });
});
