jest.mock("../../models/ClubMembership");
jest.mock("../../models/ClubJoinRequest");
jest.mock("../clubJoinNotices");

const ClubMembership = require("../../models/ClubMembership");
const ClubJoinRequest = require("../../models/ClubJoinRequest");
const { notifyStudentOfDecision } = require("../clubJoinNotices");
const { admitWaitingRequests } = require("../admitWaitingRequests");

const club = { _id: "c1", name: "Chess" };
const waiting = (docs) => ClubJoinRequest.find.mockReturnValue({ populate: jest.fn().mockResolvedValue(docs) });

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.resetAllMocks());

describe("admitWaitingRequests", () => {
  it("turns each waiting request into a membership, removes it and tells the student", async () => {
    waiting([{ _id: "r1", user: { _id: "s1" } }, { _id: "r2", user: { _id: "s2" } }]);
    ClubMembership.create.mockResolvedValue({});
    ClubJoinRequest.deleteOne.mockResolvedValue({});
    expect(await admitWaitingRequests(club)).toBe(2);
    expect(ClubMembership.create).toHaveBeenCalledWith({ user: "s1", club: "c1" });
    expect(ClubMembership.create).toHaveBeenCalledWith({ user: "s2", club: "c1" });
    expect(ClubJoinRequest.deleteOne).toHaveBeenCalledWith({ _id: "r1" });
    expect(notifyStudentOfDecision).toHaveBeenCalledWith({ _id: "s1" }, club, true);
  });

  it("is fine when the student is already a member, and drops requests from deleted accounts", async () => {
    waiting([{ _id: "r1", user: { _id: "s1" } }, { _id: "r2", user: null }]);
    ClubMembership.create.mockRejectedValue(Object.assign(new Error("dup"), { code: 11000 }));
    ClubJoinRequest.deleteOne.mockResolvedValue({});
    expect(await admitWaitingRequests(club)).toBe(1);
    expect(ClubJoinRequest.deleteOne).toHaveBeenCalledTimes(2);
    expect(notifyStudentOfDecision).toHaveBeenCalledTimes(1);
  });

  it("one failure does not stop the others, and the whole thing never throws", async () => {
    waiting([{ _id: "r1", user: { _id: "s1" } }, { _id: "r2", user: { _id: "s2" } }]);
    ClubMembership.create.mockRejectedValueOnce(new Error("db")).mockResolvedValueOnce({});
    ClubJoinRequest.deleteOne.mockResolvedValue({});
    expect(await admitWaitingRequests(club)).toBe(1);
    ClubJoinRequest.find.mockImplementation(() => { throw new Error("down"); });
    await expect(admitWaitingRequests(club)).resolves.toBe(0);
  });
});
