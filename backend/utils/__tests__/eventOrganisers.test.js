jest.mock("../../models/Club");
const Club = require("../../models/Club");
const { organiserIds } = require("../eventOrganisers");

afterEach(() => jest.resetAllMocks());

describe("organiserIds", () => {
  it("is the creator plus the leaders of the host and co-host clubs, once each", async () => {
    Club.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ leaders: ["l1", "creator"] }, { leaders: [{ _id: "l2" }, "l1"] }]) });
    const ids = await organiserIds({ createdBy: "creator", club: { _id: "c1" }, coHosts: ["c2"] });
    expect(ids.sort()).toEqual(["creator", "l1", "l2"]);
    expect(Club.find).toHaveBeenCalledWith({ _id: { $in: ["c1", "c2"] } });
  });

  it("asks for no clubs when the event has none", async () => {
    expect(await organiserIds({ createdBy: "creator", club: null, coHosts: [] })).toEqual(["creator"]);
    expect(Club.find).not.toHaveBeenCalled();
  });

  it("falls back to the creator if the lookup fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    Club.find.mockImplementation(() => { throw new Error("down"); });
    expect(await organiserIds({ createdBy: "creator", club: "c1" })).toEqual(["creator"]);
  });
});
