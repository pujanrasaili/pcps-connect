// The two one-time-link flows, "reset my password" and "verify my email".
// Both rest on signed tokens, so what matters here is what they REFUSE: a
// token made for something else, an expired or forged one, and a reset link
// used again after the password already changed.
jest.mock("../../models/User");
jest.mock("bcryptjs");
jest.mock("../../utils/sendEmail");
jest.mock("../../utils/inApp");

process.env.JWT_SECRET = "test-secret";
process.env.CLIENT_ORIGIN = "http://localhost:5173";

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const sendEmail = require("../../utils/sendEmail");
const { notifyAdmins } = require("../../utils/inApp");
const { resetPassword, verifyEmail } = require("../authController");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
const sign = (payload, options = { expiresIn: "15m" }) => jwt.sign(payload, process.env.JWT_SECRET, options);
const message = (res) => res.json.mock.calls[0][0].message;

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => {
  jest.restoreAllMocks();
  jest.resetAllMocks();
});

describe("resetPassword", () => {
  const user = (extra = {}) => ({ _id: "u1", name: "Sita", email: "s@patancollege.edu.np", save: jest.fn().mockResolvedValue(), ...extra });
  const reset = (token) => ({ body: { token, newPassword: "a-good-password-1" } });

  it("refuses a forged, expired or garbage token with the same generic message", async () => {
    const expired = sign({ id: "u1", purpose: "password-reset" }, { expiresIn: -10 });
    const forged = jwt.sign({ id: "u1", purpose: "password-reset" }, "some-other-secret");
    for (const token of [expired, forged, "not-a-token"]) {
      const res = mockRes();
      await resetPassword(reset(token), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(message(res)).toMatch(/invalid or has expired/);
    }
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("refuses a token that was made for something else (an email-verify link cannot reset a password)", async () => {
    const res = mockRes();
    await resetPassword(reset(sign({ id: "u1", purpose: "email-verify" })), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findById).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it("answers 404 when the account no longer exists", async () => {
    User.findById.mockResolvedValue(null);
    const res = mockRes();
    await resetPassword(reset(sign({ id: "u1", purpose: "password-reset" })), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("refuses a link that is used again after the password already changed", async () => {
    const token = sign({ id: "u1", purpose: "password-reset" });
    const changedAfterIssue = user({ passwordChangedAt: new Date(Date.now() + 60 * 1000) });
    User.findById.mockResolvedValue(changedAfterIssue);
    const res = mockRes();
    await resetPassword(reset(token), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(changedAfterIssue.save).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it("sets the new password, stamps the change time and sends a notice", async () => {
    const account = user({ passwordChangedAt: new Date(Date.now() - 3600 * 1000) });
    User.findById.mockResolvedValue(account);
    bcrypt.hash.mockResolvedValue("new-hash");
    sendEmail.mockResolvedValue();
    const res = mockRes();
    await resetPassword(reset(sign({ id: "u1", purpose: "password-reset" })), res);
    expect(bcrypt.hash).toHaveBeenCalledWith("a-good-password-1", 10);
    expect(account.password).toBe("new-hash");
    expect(account.passwordChangedAt.getTime()).toBeGreaterThan(Date.now() - 5000);
    expect(account.save).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("still succeeds when the change notice cannot be sent", async () => {
    User.findById.mockResolvedValue(user());
    bcrypt.hash.mockResolvedValue("new-hash");
    sendEmail.mockRejectedValue(new Error("smtp down"));
    const res = mockRes();
    await resetPassword(reset(sign({ id: "u1", purpose: "password-reset" })), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("verifyEmail", () => {
  const unverified = (extra = {}) => ({ _id: "u1", name: "Sita <b>", email: "s@patancollege.edu.np", emailVerified: false, save: jest.fn().mockResolvedValue(), ...extra });

  it("needs a token, and refuses forged, expired or wrong-purpose ones", async () => {
    let res = mockRes();
    await verifyEmail({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    for (const token of [
      sign({ id: "u1", purpose: "email-verify" }, { expiresIn: -10 }),
      jwt.sign({ id: "u1", purpose: "email-verify" }, "other-secret"),
      sign({ id: "u1", purpose: "password-reset" }), // a reset link must not verify an email
    ]) {
      res = mockRes();
      await verifyEmail({ body: { token } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(message(res)).toMatch(/invalid or has expired/);
    }
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("answers 404 for a deleted account", async () => {
    User.findById.mockResolvedValue(null);
    const res = mockRes();
    await verifyEmail({ body: { token: sign({ id: "u1", purpose: "email-verify" }) } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("an already verified account is told so, and nothing is saved or announced again", async () => {
    const account = unverified({ emailVerified: true });
    User.findById.mockResolvedValue(account);
    const res = mockRes();
    await verifyEmail({ body: { token: sign({ id: "u1", purpose: "email-verify" }) } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(account.save).not.toHaveBeenCalled();
    expect(notifyAdmins).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("marks the email verified and tells the admins a student is waiting", async () => {
    const account = unverified();
    User.findById.mockResolvedValue(account);
    sendEmail.mockResolvedValue();
    const res = mockRes();
    await verifyEmail({ body: { token: sign({ id: "u1", purpose: "email-verify" }) } }, res);
    expect(account.emailVerified).toBe(true);
    expect(account.save).toHaveBeenCalled();
    expect(notifyAdmins).toHaveBeenCalledWith(expect.objectContaining({ type: "account_pending", link: "/admin/users" }));
    expect(sendEmail.mock.calls[0][0].html).not.toContain("<b>");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("still verifies when the admin email cannot be sent", async () => {
    const account = unverified();
    User.findById.mockResolvedValue(account);
    sendEmail.mockRejectedValue(new Error("smtp down"));
    const res = mockRes();
    await verifyEmail({ body: { token: sign({ id: "u1", purpose: "email-verify" }) } }, res);
    expect(account.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
