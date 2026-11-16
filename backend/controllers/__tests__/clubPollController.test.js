jest.mock("../../models/Club");
jest.mock("../../models/ClubMembership");
jest.mock("../../models/ClubPoll");
jest.mock("../../utils/clubAccess");
jest.mock("../../utils/inApp");

const Club = require("../../models/Club");
const ClubMembership = require("../../models/ClubMembership");
const ClubPoll = require("../../models/ClubPoll");
const { canManageClub } = require("../../utils/clubAccess");
const { pushNotifications } = require("../../utils/inApp");
const { getClubPolls, createClubPoll, voteClubPoll, deleteClubPoll, shape } = require("../clubPollController");

const OID = (n) => String(n).padStart(24, "0");
const res0 = () => { const r = {}; r.status = jest.fn().mockReturnValue(r); r.json = jest.fn().mockReturnValue(r); return r; };
const selectChain = (v) => ({ select: jest.fn().mockResolvedValue(v) });
const listChain = (rows) => { const c = {}; c.sort = jest.fn().mockReturnValue(c); c.limit = jest.fn().mockReturnValue(c); c.lean = jest.fn().mockResolvedValue(rows); return c; };
const me = { _id: OID(1), name: "Maya" };
const future = () => new Date(Date.now() + 86400000);
const past = () => new Date(Date.now() - 86400000);
const poll = (over = {}) => ({ _id: OID(50), club: OID(9), question: "Which day?", options: [{ text: "Fri", voters: [OID(2), OID(3)] }, { text: "Sat", voters: [OID(1)] }], closesAt: future(), createdAt: "d", ...over });

beforeEach(() => { jest.clearAllMocks(); canManageClub.mockResolvedValue(false); ClubMembership.exists.mockResolvedValue(true); });

describe("shape", () => {
  it("gives counts and the caller's own pick, and never the voters", () => {
    const out = shape(poll(), OID(1));
    expect(out.options).toEqual([{ text: "Fri", count: 2 }, { text: "Sat", count: 1 }]);
    expect(out.total).toBe(3);
    expect(out.myVote).toBe(1);
    expect(out.closed).toBe(false);
    expect(JSON.stringify(out)).not.toContain(OID(2));
  });

  it("has no pick for someone who did not vote, and marks a past poll closed", () => {
    const out = shape(poll({ closesAt: past() }), OID(7));
    expect(out.myVote).toBeNull();
    expect(out.closed).toBe(true);
  });
});

describe("getClubPolls", () => {
  const req = { params: { id: OID(9) }, user: me };

  it("404s for a missing club", async () => {
    Club.findById.mockReturnValue(selectChain(null));
    const res = res0();
    await getClubPolls(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("keeps non-members out", async () => {
    Club.findById.mockReturnValue(selectChain({ _id: OID(9) }));
    ClubMembership.exists.mockResolvedValue(null);
    const res = res0();
    await getClubPolls(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("lets a member read the polls", async () => {
    Club.findById.mockReturnValue(selectChain({ _id: OID(9) }));
    ClubPoll.find.mockReturnValue(listChain([poll()]));
    const res = res0();
    await getClubPolls(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].polls[0].myVote).toBe(1);
  });

  it("lets staff read without being a member", async () => {
    Club.findById.mockReturnValue(selectChain({ _id: OID(9) }));
    ClubMembership.exists.mockResolvedValue(null);
    canManageClub.mockResolvedValue(true);
    ClubPoll.find.mockReturnValue(listChain([]));
    const res = res0();
    await getClubPolls(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("500s cleanly when the database fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    Club.findById.mockImplementation(() => { throw new Error("db"); });
    const res = res0();
    await getClubPolls(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("createClubPoll", () => {
  const body = { question: "Which day?", options: ["Fri", "Sat"], days: 3 };
  const req = (b = body) => ({ params: { id: OID(9) }, user: me, body: b });
  const club = { _id: OID(9), name: "Chess" };

  it("is for the club's leaders and admins only", async () => {
    Club.findById.mockReturnValue(selectChain(club));
    const res = res0();
    await createClubPoll(req(), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(ClubPoll.create).not.toHaveBeenCalled();
  });

  it("rejects bad input", async () => {
    Club.findById.mockReturnValue(selectChain(club));
    canManageClub.mockResolvedValue(true);
    const res = res0();
    await createClubPoll(req({ question: "Which day?", options: ["Only"] }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("stops at 3 open polls", async () => {
    Club.findById.mockReturnValue(selectChain(club));
    canManageClub.mockResolvedValue(true);
    ClubPoll.countDocuments.mockResolvedValue(3);
    const res = res0();
    await createClubPoll(req(), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(ClubPoll.create).not.toHaveBeenCalled();
  });

  it("saves the poll with empty votes and a close date, then tells the other members", async () => {
    Club.findById.mockReturnValue(selectChain(club));
    canManageClub.mockResolvedValue(true);
    ClubPoll.countDocuments.mockResolvedValue(0);
    ClubPoll.create.mockImplementation(async (doc) => ({ _id: OID(60), createdAt: "d", ...doc }));
    ClubMembership.find.mockReturnValue({ limit: () => ({ distinct: jest.fn().mockResolvedValue([OID(1), OID(2), OID(3)]) }) });
    const res = res0();
    await createClubPoll(req(), res);
    const saved = ClubPoll.create.mock.calls[0][0];
    expect(saved.options).toEqual([{ text: "Fri", voters: [] }, { text: "Sat", voters: [] }]);
    expect(saved.purgeAt.getTime()).toBeGreaterThan(saved.closesAt.getTime());
    expect(res.status).toHaveBeenCalledWith(201);
    expect(pushNotifications).toHaveBeenCalledWith([OID(2), OID(3)], expect.objectContaining({ type: "club_poll", title: "New poll in Chess: Which day?" }));
  });

  it("still succeeds when the notifications fail", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    Club.findById.mockReturnValue(selectChain(club));
    canManageClub.mockResolvedValue(true);
    ClubPoll.countDocuments.mockResolvedValue(0);
    ClubPoll.create.mockImplementation(async (doc) => ({ _id: OID(60), createdAt: "d", ...doc }));
    ClubMembership.find.mockImplementation(() => { throw new Error("db"); });
    const res = res0();
    await createClubPoll(req(), res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe("voteClubPoll", () => {
  const req = (option, pollId = OID(50)) => ({ params: { id: OID(9), pollId }, user: me, body: { option } });

  it("404s for a bad or missing poll", async () => {
    let res = res0();
    await voteClubPoll(req(0, "nope"), res);
    expect(res.status).toHaveBeenCalledWith(404);
    ClubPoll.findOne.mockResolvedValue(null);
    res = res0();
    await voteClubPoll(req(0), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("is for members only", async () => {
    ClubPoll.findOne.mockResolvedValue(poll());
    ClubMembership.exists.mockResolvedValue(null);
    const res = res0();
    await voteClubPoll(req(0), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("refuses a vote on a closed poll", async () => {
    ClubPoll.findOne.mockResolvedValue(poll({ closesAt: past() }));
    const res = res0();
    await voteClubPoll(req(0), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(ClubPoll.updateOne).not.toHaveBeenCalled();
  });

  it("refuses an option that does not exist", async () => {
    ClubPoll.findOne.mockResolvedValue(poll());
    for (const bad of [5, -1, "0", 1.5, undefined]) {
      const res = res0();
      await voteClubPoll(req(bad), res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(ClubPoll.updateOne).not.toHaveBeenCalled();
  });

  it("moves the vote: takes the old one back, then adds the new one", async () => {
    ClubPoll.findOne.mockResolvedValue(poll());
    ClubPoll.updateOne.mockResolvedValue({});
    ClubPoll.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(poll({ options: [{ text: "Fri", voters: [OID(1)] }, { text: "Sat", voters: [] }] })) });
    const res = res0();
    await voteClubPoll(req(0), res);
    expect(ClubPoll.updateOne).toHaveBeenNthCalledWith(1, { _id: OID(50) }, { $pull: { "options.$[].voters": OID(1) } });
    expect(ClubPoll.updateOne).toHaveBeenNthCalledWith(2, { _id: OID(50) }, { $addToSet: { "options.0.voters": OID(1) } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].poll.myVote).toBe(0);
  });

  it("500s cleanly when the database fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    ClubPoll.findOne.mockRejectedValue(new Error("db"));
    const res = res0();
    await voteClubPoll(req(0), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("deleteClubPoll", () => {
  const req = (pollId = OID(50)) => ({ params: { id: OID(9), pollId }, user: me });

  it("404s for a bad or missing poll", async () => {
    let res = res0();
    await deleteClubPoll(req("nope"), res);
    expect(res.status).toHaveBeenCalledWith(404);
    ClubPoll.findOne.mockResolvedValue(null);
    res = res0();
    await deleteClubPoll(req(), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("is for the club's leaders and admins only", async () => {
    const p = { ...poll(), deleteOne: jest.fn() };
    ClubPoll.findOne.mockResolvedValue(p);
    const res = res0();
    await deleteClubPoll(req(), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(p.deleteOne).not.toHaveBeenCalled();
  });

  it("removes the poll for staff", async () => {
    const p = { ...poll(), deleteOne: jest.fn().mockResolvedValue({}) };
    ClubPoll.findOne.mockResolvedValue(p);
    canManageClub.mockResolvedValue(true);
    const res = res0();
    await deleteClubPoll(req(), res);
    expect(p.deleteOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("500s cleanly when the database fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    ClubPoll.findOne.mockRejectedValue(new Error("db"));
    const res = res0();
    await deleteClubPoll(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
