jest.mock("mongoose", () => ({ connection: { readyState: 1 } }));
const mongoose = require("mongoose");
const { getHealth } = require("../healthController");

beforeEach(() => {
  delete process.env.BREVO_API_KEY;
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_APP_PASSWORD;
});

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("getHealth", () => {
  it("returns 200 when the database is connected", () => {
    mongoose.connection.readyState = 1;
    const res = mockRes();
    getHealth({}, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: "ok", database: "connected", email: "not-configured" });
  });

  it.each([0, 2, 3])("returns 503 when the database state is %i", (state) => {
    mongoose.connection.readyState = state;
    const res = mockRes();
    getHealth({}, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ status: "degraded", database: "disconnected", email: "not-configured" });
  });

  it("names the email method that is set up, without exposing any secret", () => {
    mongoose.connection.readyState = 1;
    process.env.BREVO_API_KEY = "xkeysib-secret";
    const res = mockRes();
    getHealth({}, res);
    expect(res.json).toHaveBeenCalledWith({ status: "ok", database: "connected", email: "brevo" });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain("secret");
  });
});
