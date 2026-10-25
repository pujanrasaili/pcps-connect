jest.mock("../../models/Club");
jest.mock("../../models/ClubPost");
jest.mock("../../utils/audit");
jest.mock("../../utils/clubAccess");

const Club = require("../../models/Club");
const ClubPost = require("../../models/ClubPost");
const { recordAudit } = require("../../utils/audit");
const { canManageClub } = require("../../utils/clubAccess");
const { getClubPosts, createClubPost, deleteClubPost } = require("../clubPostController");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
const user = { _id: "u1", name: "Sita Leader" };
const CLUB = "c".repeat(24);

afterEach(() => jest.resetAllMocks());

describe("getClubPosts", () => {
  it("returns the newest posts with only the public fields", async () => {
    const select = jest.fn().mockResolvedValue([{ body: "Hi" }]);
    const limit = jest.fn().mockReturnValue({ select });
    const sort = jest.fn().mockReturnValue({ limit });
    ClubPost.find.mockReturnValue({ sort });
    const res = mockRes();
    await getClubPosts({ params: { id: CLUB } }, res);
    expect(ClubPost.find).toHaveBeenCalledWith({ club: CLUB });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(limit).toHaveBeenCalledWith(20);
    expect(select).toHaveBeenCalledWith("body authorName createdAt");
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("createClubPost", () => {
  beforeEach(() => {
    Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: CLUB, name: "Coding Club" }) });
  });

  it("lets someone who manages the club post, and records it", async () => {
    canManageClub.mockResolvedValue(true);
    ClubPost.create.mockResolvedValue({ _id: "p1", body: "Hello", authorName: "Sita Leader", createdAt: "now" });
    const res = mockRes();
    await createClubPost({ params: { id: CLUB }, body: { body: " Hello " }, user }, res);
    expect(ClubPost.create).toHaveBeenCalledWith({ club: CLUB, author: "u1", authorName: "Sita Leader", body: "Hello" });
    expect(recordAudit).toHaveBeenCalledWith(user, "club.post", 'Posted news on "Coding Club"');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("refuses a student who doesn't manage this club", async () => {
    canManageClub.mockResolvedValue(false);
    const res = mockRes();
    await createClubPost({ params: { id: CLUB }, body: { body: "Hi" }, user }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(ClubPost.create).not.toHaveBeenCalled();
  });

  it("404s for a club that doesn't exist", async () => {
    Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const res = mockRes();
    await createClubPost({ params: { id: CLUB }, body: { body: "Hi" }, user }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("400s on empty or over-long text without saving", async () => {
    canManageClub.mockResolvedValue(true);
    for (const body of ["  ", "x".repeat(1001)]) {
      const res = mockRes();
      await createClubPost({ params: { id: CLUB }, body: { body }, user }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(ClubPost.create).not.toHaveBeenCalled();
  });
});

describe("deleteClubPost", () => {
  it("refuses someone who doesn't manage the club, before touching the database", async () => {
    canManageClub.mockResolvedValue(false);
    const res = mockRes();
    await deleteClubPost({ params: { id: CLUB, postId: "p".repeat(24) }, user }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(ClubPost.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("only deletes a post that belongs to THIS club", async () => {
    canManageClub.mockResolvedValue(true);
    ClubPost.findOneAndDelete.mockResolvedValue({ _id: "p" });
    Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ name: "Coding Club" }) });
    const res = mockRes();
    await deleteClubPost({ params: { id: CLUB, postId: "p".repeat(24) }, user }, res);
    expect(ClubPost.findOneAndDelete).toHaveBeenCalledWith({ _id: "p".repeat(24), club: CLUB });
    expect(recordAudit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("404s when the post isn't in that club", async () => {
    canManageClub.mockResolvedValue(true);
    ClubPost.findOneAndDelete.mockResolvedValue(null);
    const res = mockRes();
    await deleteClubPost({ params: { id: CLUB, postId: "p".repeat(24) }, user }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
