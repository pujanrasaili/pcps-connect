jest.mock("../../models/User");
jest.mock("bcryptjs");
jest.mock("../../utils/sendEmail");
jest.mock("../../utils/deleteAccountData");
jest.mock("../../utils/audit");
jest.mock("../../models/Registration");
jest.mock("../../models/WaitlistEntry");
jest.mock("../../models/ClubMembership");
jest.mock("../../models/Club");
jest.mock("../../models/Notification");
jest.mock("../../models/ClubJoinRequest");
jest.mock("../../models/EventQuestion");
jest.mock("../../models/ContactMessage");

process.env.JWT_SECRET = "test-secret";
process.env.CLIENT_ORIGIN = "http://localhost:5173";

const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const sendEmail = require("../../utils/sendEmail");
const { register, forgotPassword, resendVerification, updateProfile, deleteAccount } = require("../authController");
const { removeUserAndData } = require("../../utils/deleteAccountData");
const { accountEmail, pickLanguage, COPY } = require("../../utils/emailText");
const renderEmail = require("../../utils/emailTemplate");
const { escapeHtml } = require("../../utils/escapeHtml");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
}

const DEVANAGARI = /[ऀ-ॿ]/;

beforeEach(() => {
  jest.clearAllMocks();
  sendEmail.mockResolvedValue();
});

describe("pickLanguage", () => {
  it("takes the first valid language and otherwise English", () => {
    expect(pickLanguage("ne")).toBe("ne");
    expect(pickLanguage("fr", "ne")).toBe("ne");
    expect(pickLanguage(undefined, null, "en")).toBe("en");
    expect(pickLanguage("fr")).toBe("en");
    expect(pickLanguage()).toBe("en");
  });
});

describe("account email wording", () => {
  it("has English and Nepali text for every account email with the same number of paragraphs", () => {
    for (const [kind, versions] of Object.entries(COPY)) {
      expect(versions.en.paragraphs.length).toBe(versions.ne.paragraphs.length);
      expect(!!versions.en.cta).toBe(!!versions.ne.cta);
      expect(DEVANAGARI.test(versions.ne.subject + versions.ne.heading + versions.ne.paragraphs.join(""))).toBe(true);
      expect(DEVANAGARI.test(versions.en.subject + versions.en.paragraphs.join(""))).toBe(false);
      expect(kind).toBeTruthy();
    }
  });

  it("escapes the student's name in both languages", () => {
    for (const language of ["en", "ne"]) {
      const mail = accountEmail("verify", language, { name: "<b>Sita</b>", escape: escapeHtml });
      expect(mail.bodyHtml).toContain("&lt;b&gt;Sita&lt;/b&gt;");
      expect(mail.bodyHtml).not.toContain("<b>Sita</b>");
    }
  });

  it("marks the email's language and translates the paste-link line", () => {
    const html = renderEmail({ heading: "h", bodyHtml: "<p>x</p>", ctaText: "Go", ctaUrl: "https://x.test/a", language: "ne" });
    expect(html).toContain('lang="ne"');
    expect(html).toContain("टाँस्नुहोस्");
    const en = renderEmail({ heading: "h", bodyHtml: "<p>x</p>", ctaText: "Go", ctaUrl: "https://x.test/a" });
    expect(en).toContain('lang="en"');
    expect(en).toContain("Or paste this link into your browser:");
  });
});

describe("registration saves the language", () => {
  const body = (extra = {}) => ({
    name: "Sita", email: "sita@patancollege.edu.np", password: "Str0ngPassw0rd!", ...extra,
  });

  beforeEach(() => {
    bcrypt.hash.mockResolvedValue("hashed");
    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation(async (doc) => ({ _id: "u1", ...doc }));
  });

  it("stores ne and sends the verification email in Nepali", async () => {
    await register({ body: body({ language: "ne" }) }, mockRes());
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ language: "ne" }));
    const mail = sendEmail.mock.calls[0][0];
    expect(DEVANAGARI.test(mail.subject)).toBe(true);
    expect(mail.html).toContain('lang="ne"');
  });

  it("defaults to English when no language, or an unknown one, is sent", async () => {
    await register({ body: body() }, mockRes());
    expect(User.create).toHaveBeenLastCalledWith(expect.objectContaining({ language: "en" }));
    expect(sendEmail.mock.calls[0][0].subject).toBe("Verify your PCPS Connect account");
    await register({ body: body({ language: "klingon" }) }, mockRes());
    expect(User.create).toHaveBeenLastCalledWith(expect.objectContaining({ language: "en" }));
  });
});

describe("password reset and resend follow the language", () => {
  const account = (extra = {}) => ({ _id: "u1", name: "Sita", email: "sita@patancollege.edu.np", emailVerified: false, ...extra });

  it("uses the language shown on the page, else the account's, else English", async () => {
    User.findOne.mockResolvedValue(account({ language: "en" }));
    await forgotPassword({ body: { email: "sita@patancollege.edu.np", language: "ne" } }, mockRes());
    expect(DEVANAGARI.test(sendEmail.mock.calls[0][0].subject)).toBe(true);

    User.findOne.mockResolvedValue(account({ language: "ne" }));
    await forgotPassword({ body: { email: "sita@patancollege.edu.np" } }, mockRes());
    expect(DEVANAGARI.test(sendEmail.mock.calls[1][0].subject)).toBe(true);

    User.findOne.mockResolvedValue(account());
    await forgotPassword({ body: { email: "sita@patancollege.edu.np" } }, mockRes());
    expect(sendEmail.mock.calls[2][0].subject).toBe("Reset your PCPS Connect password");
  });

  it("resends the verification email in the language asked for", async () => {
    User.findOne.mockResolvedValue(account({ language: "en" }));
    await resendVerification({ body: { email: "sita@patancollege.edu.np", language: "ne" } }, mockRes());
    expect(DEVANAGARI.test(sendEmail.mock.calls[0][0].subject)).toBe(true);
  });
});

describe("profile language", () => {
  it("can be changed, and only to a supported language", async () => {
    User.findByIdAndUpdate.mockResolvedValue({ _id: "u1", name: "Sita", language: "ne" });
    const res = mockRes();
    await updateProfile({ user: { _id: "u1" }, body: { language: "ne" } }, res);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith("u1", { language: "ne" }, expect.anything());
    expect(res.json.mock.calls[0][0].user.language).toBe("ne");

    const bad = mockRes();
    await updateProfile({ user: { _id: "u1" }, body: { language: "xx" } }, bad);
    expect(bad.status).toHaveBeenCalledWith(400);
    expect(User.findByIdAndUpdate).toHaveBeenCalledTimes(1);
  });
});

describe("account deletion notice", () => {
  it("is written in the language the account had before it was removed", async () => {
    const user = { _id: "u1", name: "Sita", email: "sita@patancollege.edu.np", password: "hashed", language: "ne", role: "user" };
    User.findById = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    bcrypt.compare.mockResolvedValue(true);
    removeUserAndData.mockResolvedValue();
    await deleteAccount({ user: { _id: "u1" }, body: { password: "x" } }, mockRes());
    const mail = sendEmail.mock.calls.find(([m]) => /मेटाइयो|deleted/.test(m.subject))[0];
    expect(DEVANAGARI.test(mail.subject)).toBe(true);
  });
});
