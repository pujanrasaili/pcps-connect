const express = require("express");

// Real router and real id validation; only login and the handlers are faked.
jest.mock("../../middleware/auth", () => ({ protect: (req, res, next) => { req.user = { _id: "u1" }; next(); } }));
jest.mock("../../middleware/rateLimit", () => ({ actionLimiter: (req, res, next) => next() }));
jest.mock("../../controllers/waitlistController", () => ({
  getMyWaitlist: (req, res) => res.json({ handler: "my" }),
  getWaitlistStatus: (req, res) => res.json({ handler: "status", id: req.params.eventId }),
  joinWaitlist: (req, res) => res.json({ handler: "join" }),
  leaveWaitlist: (req, res) => res.json({ handler: "leave" }),
}));

const routes = require("../waitlistRoutes");

async function get(path) {
  const app = express();
  app.use("/api/waitlist", routes);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/waitlist${path}`);
    return { status: res.status, body: await res.json().catch(() => null) };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

describe("waitlist routes", () => {
  it("GET /my reaches the my-waitlist handler (not mistaken for an event id)", async () => {
    expect(await get("/my")).toEqual({ status: 200, body: { handler: "my" } });
  });

  it("GET /:eventId still reaches the status handler for a real id", async () => {
    const id = "a".repeat(24);
    expect(await get(`/${id}`)).toEqual({ status: 200, body: { handler: "status", id } });
  });

  it("a malformed event id is still a clean 404", async () => {
    expect((await get("/not-an-id")).status).toBe(404);
  });
});
