const { runSmokeChecks } = require("../smokeChecks");

const reply = (status, body, headers = {}) => ({
  status,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  json: async () => body,
  text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
});

function healthySite(overrides = {}) {
  return async (url) => {
    if (overrides[url]) return overrides[url];
    if (url.endsWith("/api/health")) return reply(200, { status: "ok", database: "connected", email: "brevo" }, { "x-content-type-options": "nosniff" });
    if (url.endsWith("/api/events")) return reply(200, { events: [{}, {}] });
    if (url.endsWith("/api/clubs")) return reply(200, { clubs: [{}] });
    if (url.includes("/api/")) return reply(401, { message: "no" });
    if (url.endsWith("/events")) return reply(200, "<html>");
    return reply(200, '<div id="root"></div>', { "content-security-policy": "default-src 'self'" });
  };
}

describe("runSmokeChecks", () => {
  it("passes on a healthy deployment", async () => {
    const results = await runSmokeChecks("https://api.test/", "https://site.test/", healthySite());
    expect(results.filter((r) => !r.ok)).toEqual([]);
    expect(results.length).toBeGreaterThanOrEqual(8);
  });

  it("flags a disconnected database and the Gmail fallback", async () => {
    const fetchFn = healthySite({
      "https://api.test/api/health": reply(503, { status: "degraded", database: "disconnected", email: "gmail-smtp" }, { "x-content-type-options": "nosniff" }),
    });
    const failed = (await runSmokeChecks("https://api.test", "https://site.test", fetchFn)).filter((r) => !r.ok).map((r) => r.name);
    expect(failed).toEqual(expect.arrayContaining([
      "API is awake and the database is connected",
      "Email can really be sent (not the Gmail SMTP fallback)",
    ]));
  });

  it("flags a private page that answers a visitor with data", async () => {
    const fetchFn = healthySite({ "https://api.test/api/notifications": reply(200, { notifications: [] }) });
    const failed = (await runSmokeChecks("https://api.test", "https://site.test", fetchFn)).filter((r) => !r.ok);
    expect(failed.map((r) => r.name)).toEqual(["Private pages refuse visitors who are not logged in"]);
    expect(failed[0].detail).toMatch(/notifications/);
  });

  it("reports a network error as a failed check instead of crashing", async () => {
    const results = await runSmokeChecks("https://api.test", "https://site.test", async () => { throw new Error("ECONNREFUSED"); });
    expect(results.every((r) => !r.ok)).toBe(true);
    expect(results[0].detail).toBe("ECONNREFUSED");
  });
});
