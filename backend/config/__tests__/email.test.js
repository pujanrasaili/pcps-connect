jest.mock("nodemailer", () => ({ createTransport: jest.fn(() => ({ sendMail: jest.fn() })) }));
const nodemailer = require("nodemailer");

describe("email transporter", () => {
  it("queues bulk sends through a small connection pool instead of one connection per message", () => {
    process.env.EMAIL_USER = "club@example.com";
    process.env.EMAIL_APP_PASSWORD = "app-password";
    jest.isolateModules(() => require("../email"));
    const options = nodemailer.createTransport.mock.calls[0][0];
    expect(options.service).toBe("gmail");
    expect(options.pool).toBe(true);
    expect(options.maxConnections).toBeLessThanOrEqual(5);
    expect(options.rateLimit).toBeGreaterThan(0);
    expect(options.auth).toEqual({ user: "club@example.com", pass: "app-password" });
  });
});
