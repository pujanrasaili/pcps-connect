jest.mock("../../utils/clubAccess");
const { ledClubs } = require("../../utils/clubAccess");
const { getMyLedClubs } = require("../leaderController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
afterEach(() => jest.resetAllMocks());

describe("getMyLedClubs", () => {
  it("returns the clubs the user leads", async () => {
    ledClubs.mockResolvedValue([{ _id: "c1", name: "Tech" }]);
    const res = mockRes();
    await getMyLedClubs({ user: { _id: "u" } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ clubs: [{ _id: "c1", name: "Tech" }] });
  });
  it("500s without leaking the error", async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    jest.spyOn(console, "error").mockImplementation(() => {});
    ledClubs.mockRejectedValue(new Error("secret db detail"));
    const res = mockRes();
    await getMyLedClubs({ user: { _id: "u" } }, res);
    process.env.NODE_ENV = prev;
    expect(res.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain("secret db detail");
  });
});
