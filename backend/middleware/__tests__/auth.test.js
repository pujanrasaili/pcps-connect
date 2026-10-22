const jwt = require("jsonwebtoken");

jest.mock("../../models/User");
const User = require("../../models/User");
const { protect, adminOnly, optionalAuth } = require("../auth");

const JWT_SECRET = "test-secret-for-jest";

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("protect", () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("rejects a request with no token cookie", async () => {
    const req = { cookies: {} };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a malformed/invalid token", async () => {
    const req = { cookies: { token: "not-a-real-jwt" } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an expired token", async () => {
    const expiredToken = jwt.sign({ id: "user1" }, JWT_SECRET, { expiresIn: -10 });
    const req = { cookies: { token: expiredToken } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a genuine login token ({ id } only) and attaches req.user", async () => {
    const loginToken = jwt.sign({ id: "user1" }, JWT_SECRET, { expiresIn: "7d" });
    const fakeUser = { _id: "user1", role: "user" };
    User.findById.mockResolvedValue(fakeUser);

    const req = { cookies: { token: loginToken } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(req.user).toBe(fakeUser);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  // Regression test for the fix made this session: an email-verification
  // or password-reset link is a JWT signed with the same secret, but with
  // a "purpose" claim. Before the fix, `protect` accepted any token whose
  // payload had an `id` -- so a leaked verify/reset link (forwarded email,
  // shared computer, browser history) could be dropped into the "token"
  // cookie and used to fully log in as that user, no password needed.
  it.each(["email-verify", "password-reset"])(
    "rejects a %s token even though it's signed with the same secret and carries a valid id",
    async (purpose) => {
      const User2 = require("../../models/User");
      const sameSecretPurposeToken = jwt.sign({ id: "user1", purpose }, JWT_SECRET, {
        expiresIn: "24h",
      });
      const req = { cookies: { token: sameSecretPurposeToken } };
      const res = mockRes();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
      // Must short-circuit before ever hitting the database with it.
      expect(User2.findById).not.toHaveBeenCalled();
    }
  );

  it("rejects when the token's user id no longer exists (e.g. deleted account)", async () => {
    const token = jwt.sign({ id: "deleted-user" }, JWT_SECRET, { expiresIn: "7d" });
    User.findById.mockResolvedValue(null);

    const req = { cookies: { token } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // Regression test for the fix made this session: a password change/reset
  // didn't invalidate tokens issued before it, so a stolen cookie (or a
  // replayed, already-used reset link) kept working indefinitely.
  it.each(["rejected", "pending"])("rejects an already-logged-in user whose account is now %s", async (approvalStatus) => {
    const token = jwt.sign({ id: "user1" }, JWT_SECRET);
    User.findById.mockResolvedValue({ _id: "user1", role: "user", approvalStatus });
    const req = { cookies: { token } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("lets an approved user through", async () => {
    const token = jwt.sign({ id: "user1" }, JWT_SECRET);
    User.findById.mockResolvedValue({ _id: "user1", role: "user", approvalStatus: "approved" });
    const req = { cookies: { token } };
    const next = jest.fn();

    await protect(req, mockRes(), next);

    expect(next).toHaveBeenCalled();
  });

  it("rejects a token issued before the user's last password change", async () => {
    const staleToken = jwt.sign({ id: "user1" }, JWT_SECRET, { expiresIn: "7d" });
    // Password changed 1 second after the token's iat.
    const fakeUser = {
      _id: "user1",
      role: "user",
      passwordChangedAt: new Date(Date.now() + 1000),
    };
    User.findById.mockResolvedValue(fakeUser);

    const req = { cookies: { token: staleToken } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a token issued in the same second as passwordChangedAt (freshly re-issued token right after a change)", async () => {
    const token = jwt.sign({ id: "user1" }, JWT_SECRET, { expiresIn: "7d" });
    const { iat } = jwt.decode(token);
    // passwordChangedAt a few hundred ms into the SAME second as the
    // token's iat -- this must not be treated as "issued before the change"
    // just because iat is floored down to the start of that second.
    const fakeUser = {
      _id: "user1",
      role: "user",
      passwordChangedAt: new Date(iat * 1000 + 800),
    };
    User.findById.mockResolvedValue(fakeUser);

    const req = { cookies: { token } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(req.user).toBe(fakeUser);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("accepts a token with no passwordChangedAt set (never changed)", async () => {
    const token = jwt.sign({ id: "user1" }, JWT_SECRET, { expiresIn: "7d" });
    const fakeUser = { _id: "user1", role: "user", passwordChangedAt: null };
    User.findById.mockResolvedValue(fakeUser);

    const req = { cookies: { token } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(req.user).toBe(fakeUser);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("adminOnly", () => {
  it("allows an admin through", () => {
    const req = { user: { role: "admin" } };
    const res = mockRes();
    const next = jest.fn();

    adminOnly(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("blocks a non-admin with 403", () => {
    const req = { user: { role: "user" } };
    const res = mockRes();
    const next = jest.fn();

    adminOnly(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("blocks when req.user is missing entirely", () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    adminOnly(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("optionalAuth", () => {
  const originalSecret = process.env.JWT_SECRET;
  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });
  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });
  afterEach(() => jest.clearAllMocks());

  it("lets a visitor with no cookie through as a guest", async () => {
    const req = { cookies: {} };
    const next = jest.fn();
    await optionalAuth(req, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });

  it("treats an invalid token as a guest (once), never as an error", async () => {
    const req = { cookies: { token: "garbage" } };
    const res = mockRes();
    const next = jest.fn();
    await optionalAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it("attaches the user for a valid login", async () => {
    const user = { _id: "u1", approvalStatus: "approved" };
    User.findById.mockResolvedValue(user);
    const req = { cookies: { token: jwt.sign({ id: "u1" }, JWT_SECRET) } };
    const next = jest.fn();
    await optionalAuth(req, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBe(user);
  });

  it("treats a rejected account's token as a guest", async () => {
    User.findById.mockResolvedValue({ _id: "u1", approvalStatus: "rejected" });
    const req = { cookies: { token: jwt.sign({ id: "u1" }, JWT_SECRET) } };
    const next = jest.fn();
    await optionalAuth(req, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });
});
