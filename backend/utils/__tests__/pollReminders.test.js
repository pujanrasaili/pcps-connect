jest.mock("../../models/ClubPoll");
jest.mock("../../models/ClubMembership");
jest.mock("../inApp");

const ClubPoll = require("../../models/ClubPoll");
const ClubMembership = require("../../models/ClubMembership");
const { pushNotifications } = require("../inApp");
const { remindPollVoters } = require("../pollReminders");

const NOW = new Date("2030-01-10T12:00:00Z");
const poll = (over = {}) => ({
  _id: "p1",
  club: { _id: "c1", name: "Coding Club" },
  question: "Which day?",
  options: [{ voters: ["u1"] }, { voters: [] }],
  ...over,
});
const finder = (rows) => ({ select: () => ({ populate: jest.fn().mockResolvedValue(rows) }) });
const members = (ids) => ({ select: jest.fn().mockResolvedValue(ids.map((user) => ({ user }))) });
afterEach(() => jest.resetAllMocks());

describe("remindPollVoters", () => {
  it("reminds only the members who have not voted, once per poll", async () => {
    ClubPoll.find.mockReturnValue(finder([poll()]));
    ClubPoll.findOneAndUpdate.mockResolvedValue({ _id: "p1" });
    ClubMembership.find.mockReturnValue(members(["u1", "u2", "u3"]));
    pushNotifications.mockImplementation(async (ids) => ids.length);
    expect(await remindPollVoters(NOW)).toBe(2);
    const filter = ClubPoll.find.mock.calls[0][0];
    expect(filter.closesAt.$gt).toEqual(NOW);
    expect(filter.closesAt.$lte).toEqual(new Date("2030-01-11T12:00:00Z"));
    expect(filter.reminded).toEqual({ $ne: true });
    expect(ClubPoll.findOneAndUpdate).toHaveBeenCalledWith({ _id: "p1", reminded: { $ne: true } }, { $set: { reminded: true } });
    expect(ClubMembership.find).toHaveBeenCalledWith({ club: "c1" });
    const [ids, message] = pushNotifications.mock.calls[0];
    expect(ids).toEqual(["u2", "u3"]);
    expect(message).toEqual({ type: "club_poll_closing", title: "Poll closing soon in Coding Club: Which day?", link: "/clubs?club=c1" });
  });

  it("skips a poll another run already claimed", async () => {
    ClubPoll.find.mockReturnValue(finder([poll()]));
    ClubPoll.findOneAndUpdate.mockResolvedValue(null);
    expect(await remindPollVoters(NOW)).toBe(0);
    expect(pushNotifications).not.toHaveBeenCalled();
  });

  it("does nothing when no poll is closing soon", async () => {
    ClubPoll.find.mockReturnValue(finder([]));
    expect(await remindPollVoters(NOW)).toBe(0);
    expect(ClubPoll.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
