const { corsPolicy, PREFLIGHT_MAX_AGE_SECONDS } = require("../corsPolicy");

function preflight(origin) {
  const headers = {};
  const req = { method: "OPTIONS", headers: { origin, "access-control-request-method": "GET", "access-control-request-headers": "x-requested-with" } };
  const res = {
    statusCode: 0,
    setHeader: (k, v) => { headers[k.toLowerCase()] = v; },
    getHeader: (k) => headers[k.toLowerCase()],
    end: jest.fn(),
  };
  const next = jest.fn();
  corsPolicy()(req, res, next);
  return { headers, res, next };
}

describe("corsPolicy", () => {
  const original = process.env.CLIENT_ORIGIN;
  beforeEach(() => { process.env.CLIENT_ORIGIN = "https://pcps-connect.example"; });
  afterAll(() => { process.env.CLIENT_ORIGIN = original; });

  it("lets browsers remember the preflight answer for a day", () => {
    const { headers } = preflight("https://pcps-connect.example");
    expect(PREFLIGHT_MAX_AGE_SECONDS).toBe(86400);
    expect(headers["access-control-max-age"]).toBe("86400");
  });

  it("still allows only the configured site, with cookies", () => {
    const { headers } = preflight("https://pcps-connect.example");
    expect(headers["access-control-allow-origin"]).toBe("https://pcps-connect.example");
    expect(headers["access-control-allow-credentials"]).toBe("true");
  });

  it("does not grant another site access", () => {
    const { headers } = preflight("https://evil.example");
    expect(headers["access-control-allow-origin"]).toBe("https://pcps-connect.example");
  });
});
