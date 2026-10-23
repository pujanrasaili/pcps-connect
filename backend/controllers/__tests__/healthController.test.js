jest.mock("mongoose", () => ({ connection: { readyState: 1 } }));
const mongoose = require("mongoose");
const { getHealth } = require("../healthController");

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
    expect(res.json).toHaveBeenCalledWith({ status: "ok", database: "connected" });
  });

  it.each([0, 2, 3])("returns 503 when the database state is %i", (state) => {
    mongoose.connection.readyState = state;
    const res = mockRes();
    getHealth({}, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ status: "degraded", database: "disconnected" });
  });
});
