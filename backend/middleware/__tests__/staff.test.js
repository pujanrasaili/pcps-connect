jest.mock("../../models/Club");
const Club = require("../../models/Club");
const { staffOnly } = require("../staff");

const run = async (user) => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  await staffOnly({ user }, res, next);
  return { res, next };
};
afterEach(() => jest.resetAllMocks());

describe("staffOnly", () => {
  it("lets admins through without a club lookup", async () => {
    const { next } = await run({ _id: "a", role: "admin" });
    expect(next).toHaveBeenCalled();
    expect(Club.exists).not.toHaveBeenCalled();
  });
  it("lets a club leader through", async () => {
    Club.exists.mockResolvedValue({ _id: "c" });
    const { next } = await run({ _id: "u", role: "user" });
    expect(Club.exists).toHaveBeenCalledWith({ leaders: "u" });
    expect(next).toHaveBeenCalled();
  });
  it("403s an ordinary student", async () => {
    Club.exists.mockResolvedValue(null);
    const { res, next } = await run({ _id: "u", role: "user" });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
  it("fails closed with a 500 if the lookup errors", async () => {
    Club.exists.mockRejectedValue(new Error("db"));
    const { res, next } = await run({ _id: "u", role: "user" });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });
});
