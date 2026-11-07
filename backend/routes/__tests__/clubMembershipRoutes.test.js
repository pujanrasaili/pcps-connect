const express = require("express");

// Real router; login, the limiter and handlers are faked. The limiter fake
// records that it ran, so we can prove join and leave sit behind it.
const calls = [];
jest.mock("../../middleware/auth", () => ({ protect: (req, res, next) => { req.user = { _id: "u1" }; next(); } }));
jest.mock("../../middleware/rateLimit", () => ({
  actionLimiter: (req, res, next) => { calls.push(`${req.method} ${req.path}`); next(); },
}));
jest.mock("../../controllers/clubMembershipController", () => ({
  getMyMemberships: (req, res) => res.json({ handler: "my" }),
  getMyClubNews: (req, res) => res.json({ handler: "news" }),
  getMyJoinRequests: (req, res) => res.json({ handler: "requests" }),
  joinClub: (req, res) => res.json({ handler: "join" }),
  leaveClub: (req, res) => res.json({ handler: "leave" }),
}));

const routes = require("../clubMembershipRoutes");

async function call(method, path) {
  const app = express();
  app.use(express.json());
  app.use("/api/memberships", routes);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/memberships${path}`, { method });
    return res.json();
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

beforeEach(() => { calls.length = 0; });

describe("club membership routes", () => {
  it("joining goes through the action limiter", async () => {
    expect(await call("POST", "/join")).toEqual({ handler: "join" });
    expect(calls).toEqual(["POST /join"]);
  });

  it("leaving goes through the action limiter", async () => {
    const id = "a".repeat(24);
    expect(await call("DELETE", `/${id}`)).toEqual({ handler: "leave" });
    expect(calls).toEqual([`DELETE /${id}`]);
  });

  it("reading your memberships is not limited", async () => {
    expect(await call("GET", "/my")).toEqual({ handler: "my" });
    expect(calls).toEqual([]);
  });

  it("the club news feed is a plain read, not limited", async () => {
    expect(await call("GET", "/news")).toEqual({ handler: "news" });
    expect(calls).toEqual([]);
  });
});
