const express = require("express");
const { loginLimiter } = require("../rateLimit");

// A tiny app with the real limiter in front of a fake login: the password
// "right" succeeds, anything else is a 401.
function startApp() {
  const app = express();
  app.use(express.json());
  app.post("/login", loginLimiter, (req, res) => {
    if (req.body.password === "right") return res.status(200).json({ ok: true });
    res.status(401).json({ message: "Invalid credentials" });
  });
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function login(server, password) {
  return fetch(`http://127.0.0.1:${server.address().port}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

describe("loginLimiter", () => {
  let server;
  beforeEach(async () => {
    server = await startApp();
  });
  afterEach(() => new Promise((resolve) => server.close(resolve)));

  it("does not count successful logins (many students share one campus IP)", async () => {
    for (let i = 0; i < 40; i++) {
      const res = await login(server, "right");
      expect(res.status).toBe(200);
    }
  });

  it("blocks an IP after 20 failed attempts, even for the right password", async () => {
    for (let i = 0; i < 20; i++) {
      expect((await login(server, "wrong")).status).toBe(401);
    }
    const blocked = await login(server, "right");
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).message).toMatch(/too many attempts/i);
  });
});
