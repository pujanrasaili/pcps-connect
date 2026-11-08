jest.mock("../../models/Club");
jest.mock("../../models/ClubIdea");
jest.mock("../../models/ClubMembership");
jest.mock("../../utils/clubAccess");
jest.mock("../../utils/inApp");

const Club = require("../../models/Club");
const ClubIdea = require("../../models/ClubIdea");
const ClubMembership = require("../../models/ClubMembership");
const { canManageClub } = require("../../utils/clubAccess");
const { pushNotifications } = require("../../utils/inApp");
const { getClubIdeas, createClubIdea, deleteClubIdea } = require("../clubIdeaController");

const res0 = () => { const r = {}; r.status = jest.fn().mockReturnValue(r); r.json = jest.fn().mockReturnValue(r); return r; };
const selectChain = (v) => ({ select: jest.fn().mockResolvedValue(v) });
const listChain = (rows) => { const c = {}; c.sort = jest.fn().mockReturnValue(c); c.limit = jest.fn().mockReturnValue(c); c.select = jest.fn().mockReturnValue(c); c.lean = jest.fn().mockResolvedValue(rows); return c; };
const me = { _id: "u1", name: "Maya" };

beforeEach(() => { jest.clearAllMocks(); canManageClub.mockResolvedValue(false); });

describe("getClubIdeas", () => {
  it("404s for a club that does not exist", async () => {
    Club.findById.mockReturnValue(selectChain(null));
    const res = res0();
    await getClubIdeas({ params: { id: "c1" }, user: me }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("shows a member only their own ideas", async () => {
    Club.findById.mockReturnValue(selectChain({ _id: "c1" }));
    ClubIdea.find.mockReturnValue(listChain([{ _id: "i1", body: "Chess day", authorName: "Maya", author: "u1", createdAt: "d" }]));
    const res = res0();
    await getClubIdeas({ params: { id: "c1" }, user: me }, res);
    expect(ClubIdea.find).toHaveBeenCalledWith({ club: "c1", author: "u1" });
    expect(res.json).toHaveBeenCalledWith({ ideas: [{ _id: "i1", body: "Chess day", authorName: "Maya", createdAt: "d", mine: true }], canReadAll: false });
  });

  it("shows leaders and admins every idea, and never leaks the author's account", async () => {
    Club.findById.mockReturnValue(selectChain({ _id: "c1" }));
    canManageClub.mockResolvedValue(true);
    ClubIdea.find.mockReturnValue(listChain([{ _id: "i2", body: "Trip", authorName: "Ram", author: "u9", createdAt: "d" }]));
    const res = res0();
    await getClubIdeas({ params: { id: "c1" }, user: me }, res);
    expect(ClubIdea.find).toHaveBeenCalledWith({ club: "c1" });
    const body = res.json.mock.calls[0][0];
    expect(body.canReadAll).toBe(true);
    expect(body.ideas[0]).toEqual({ _id: "i2", body: "Trip", authorName: "Ram", createdAt: "d", mine: false });
  });

  it("500s cleanly when the database fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    Club.findById.mockImplementation(() => { throw new Error("db"); });
    const res = res0();
    await getClubIdeas({ params: { id: "c1" }, user: me }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("createClubIdea", () => {
  const req = (body) => ({ params: { id: "c1" }, user: me, body });
  beforeEach(() => {
    Club.findById.mockImplementation((id) => ({ select: jest.fn().mockResolvedValue({ _id: id, name: "Chess", leaders: ["l1", "u1"] }) }));
    ClubMembership.exists.mockResolvedValue({ _id: "m1" });
    ClubIdea.countDocuments.mockResolvedValue(0);
    ClubIdea.create.mockResolvedValue({ _id: "i1", body: "A quiz night", authorName: "Maya", createdAt: "d" });
  });

  it("404s for a club that does not exist", async () => {
    Club.findById.mockReturnValue(selectChain(null));
    const res = res0();
    await createClubIdea(req({ body: "x" }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("refuses people who have not joined the club", async () => {
    ClubMembership.exists.mockResolvedValue(null);
    const res = res0();
    await createClubIdea(req({ body: "A quiz night" }), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(ClubIdea.create).not.toHaveBeenCalled();
  });

  it.each([[{}], [{ body: 5 }], [{ body: "   " }], [{ body: { $ne: 1 } }], [{ body: "x".repeat(301) }]])("rejects %j", async (body) => {
    const res = res0();
    await createClubIdea(req(body), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(ClubIdea.create).not.toHaveBeenCalled();
  });

  it("allows at most three waiting ideas per member", async () => {
    ClubIdea.countDocuments.mockResolvedValue(3);
    const res = res0();
    await createClubIdea(req({ body: "One more" }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(ClubIdea.create).not.toHaveBeenCalled();
  });

  it("saves the idea trimmed and tells the club's leaders (not the author)", async () => {
    const res = res0();
    await createClubIdea(req({ body: "  A quiz night  " }), res);
    expect(ClubIdea.create).toHaveBeenCalledWith({ club: "c1", author: "u1", authorName: "Maya", body: "A quiz night" });
    expect(pushNotifications).toHaveBeenCalledWith(["l1"], expect.objectContaining({ type: "club_idea", link: "/clubs?club=c1" }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("still saves the idea when the leader notification fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    pushNotifications.mockRejectedValue(new Error("bell down"));
    const res = res0();
    await createClubIdea(req({ body: "A quiz night" }), res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe("deleteClubIdea", () => {
  const req = { params: { id: "c1", ideaId: "i1" }, user: me };
  const idea = (author) => ({ author, club: "c1", deleteOne: jest.fn().mockResolvedValue() });

  it("404s when the idea is not in that club", async () => {
    ClubIdea.findOne.mockResolvedValue(null);
    const res = res0();
    await deleteClubIdea(req, res);
    expect(ClubIdea.findOne).toHaveBeenCalledWith({ _id: "i1", club: "c1" });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("lets the author remove their own idea", async () => {
    const doc = idea("u1");
    ClubIdea.findOne.mockResolvedValue(doc);
    const res = res0();
    await deleteClubIdea(req, res);
    expect(doc.deleteOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("lets a leader or admin remove someone else's idea", async () => {
    const doc = idea("u9");
    ClubIdea.findOne.mockResolvedValue(doc);
    canManageClub.mockResolvedValue(true);
    const res = res0();
    await deleteClubIdea(req, res);
    expect(doc.deleteOne).toHaveBeenCalled();
  });

  it("refuses anyone else", async () => {
    const doc = idea("u9");
    ClubIdea.findOne.mockResolvedValue(doc);
    const res = res0();
    await deleteClubIdea(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(doc.deleteOne).not.toHaveBeenCalled();
  });
});
