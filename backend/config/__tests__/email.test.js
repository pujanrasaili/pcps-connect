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
    expect(options.connectionTimeout).toBeLessThanOrEqual(15000);
    expect(options.greetingTimeout).toBeLessThanOrEqual(15000);
    expect(options.socketTimeout).toBeLessThanOrEqual(30000);
    expect(options.auth).toEqual({ user: "club@example.com", pass: "app-password" });
  });

  it("uses Brevo's HTTPS API instead of SMTP when BREVO_API_KEY is set (Render's free tier blocks SMTP)", () => {
    nodemailer.createTransport.mockClear();
    process.env.BREVO_API_KEY = "key";
    let transporter;
    jest.isolateModules(() => {
      transporter = require("../email");
    });
    delete process.env.BREVO_API_KEY;
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(typeof transporter.sendMail).toBe("function");
  });
});
