jest.mock("../../models/Club");
jest.mock("../../models/ClubPost");
jest.mock("../../models/ClubMembership");
jest.mock("../../utils/inApp");
jest.mock("../../utils/audit");
jest.mock("../../utils/clubAccess");
jest.mock("../../middleware/upload", () => ({ uploadBufferToCloudinary: jest.fn() }));
jest.mock("../../utils/clubNewsPhotoCleanup", () => ({ destroyClubNewsPhotos: jest.fn().mockResolvedValue() }));

const Club = require("../../models/Club");
const ClubPost = require("../../models/ClubPost");
const ClubMembership = require("../../models/ClubMembership");
const { pushNotifications } = require("../../utils/inApp");
const { recordAudit } = require("../../utils/audit");
const { canManageClub } = require("../../utils/clubAccess");
const { uploadBufferToCloudinary } = require("../../middleware/upload");
const { destroyClubNewsPhotos } = require("../../utils/clubNewsPhotoCleanup");
const { getClubPosts, createClubPost, updateClubPost, deleteClubPost } = require("../clubPostController");

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
    expect(select).toHaveBeenCalledWith("body image authorName createdAt editedAt");
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

describe("club news photos", () => {
  it("uploads an attached photo to the club-news folder and saves its address", async () => {
    canManageClub.mockResolvedValue(true);
    Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: CLUB, name: "Coding Club" }) });
    uploadBufferToCloudinary.mockResolvedValue({ secure_url: "https://res.cloudinary.com/x/image/upload/v1/pcps-connect/club-news/a.jpg" });
    ClubPost.create.mockImplementation(async (f) => ({ _id: "p1", createdAt: "now", ...f }));
    const res = mockRes();
    await createClubPost({ params: { id: CLUB }, body: { body: "Look" }, file: { buffer: Buffer.from("x") }, user }, res);
    expect(uploadBufferToCloudinary).toHaveBeenCalledWith(expect.any(Buffer), "pcps-connect/club-news");
    expect(ClubPost.create).toHaveBeenCalledWith(expect.objectContaining({ image: expect.stringContaining("/club-news/a.jpg") }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("does not upload anything for a refused or invalid post", async () => {
    uploadBufferToCloudinary.mockClear();
    canManageClub.mockResolvedValue(false);
    Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: CLUB, name: "C" }) });
    await createClubPost({ params: { id: CLUB }, body: { body: "Hi" }, file: { buffer: Buffer.from("x") }, user }, mockRes());
    canManageClub.mockResolvedValue(true);
    await createClubPost({ params: { id: CLUB }, body: { body: "  " }, file: { buffer: Buffer.from("x") }, user }, mockRes());
    expect(uploadBufferToCloudinary).not.toHaveBeenCalled();
  });

  it("removes the photo from Cloudinary when its post is deleted", async () => {
    canManageClub.mockResolvedValue(true);
    ClubPost.findOneAndDelete.mockResolvedValue({ _id: "p", image: "https://res.cloudinary.com/x/image/upload/pcps-connect/club-news/a.jpg" });
    Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ name: "Coding Club" }) });
    await deleteClubPost({ params: { id: CLUB, postId: "p".repeat(24) }, user }, mockRes());
    expect(destroyClubNewsPhotos).toHaveBeenCalledWith(["https://res.cloudinary.com/x/image/upload/pcps-connect/club-news/a.jpg"]);
  });
});

describe("updateClubPost", () => {
  const params = { id: CLUB, postId: "p".repeat(24) };
  it("refuses someone who doesn't manage the club, before touching the database", async () => {
    canManageClub.mockResolvedValue(false);
    const res = mockRes();
    await updateClubPost({ params, body: { body: "Fixed" }, user }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(ClubPost.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects empty or over-long text", async () => {
    canManageClub.mockResolvedValue(true);
    for (const body of ["  ", "x".repeat(1001), 5]) {
      const res = mockRes();
      await updateClubPost({ params, body: { body }, user }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(ClubPost.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("only edits a post of THIS club, trims the text, marks it edited and logs it", async () => {
    canManageClub.mockResolvedValue(true);
    ClubPost.findOneAndUpdate.mockResolvedValue({ _id: "p", body: "Fixed", image: "", authorName: "Sita", createdAt: "c", editedAt: "e" });
    Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ name: "Coding Club" }) });
    const res = mockRes();
    await updateClubPost({ params, body: { body: " Fixed " }, user }, res);
    expect(ClubPost.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: params.postId, club: CLUB },
      { body: "Fixed", editedAt: expect.any(Date) },
      { new: true }
    );
    expect(recordAudit).toHaveBeenCalledWith(user, "club.postEdited", 'Edited a news post on "Coding Club"');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("404s when the post isn't in that club", async () => {
    canManageClub.mockResolvedValue(true);
    ClubPost.findOneAndUpdate.mockResolvedValue(null);
    const res = mockRes();
    await updateClubPost({ params, body: { body: "Fixed" }, user }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("telling members about a new post", () => {
  it("puts a bell message in each member's inbox except the author's", async () => {
    canManageClub.mockResolvedValue(true);
    Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: CLUB, name: "Coding Club" }) });
    ClubPost.create.mockResolvedValue({ _id: "p1", body: "Hi", createdAt: "now" });
    ClubMembership.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ user: "u1" }, { user: "m2" }, { user: "m3" }]) });
    const res = mockRes();
    await createClubPost({ params: { id: CLUB }, body: { body: "Hi" }, user }, res);
    expect(pushNotifications).toHaveBeenCalledWith(["m2", "m3"], {
      type: "club_news",
      title: "Coding Club shared a news update",
      link: `/clubs?club=${CLUB}`,
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("still saves the post when the notification step fails", async () => {
    canManageClub.mockResolvedValue(true);
    Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: CLUB, name: "C" }) });
    ClubPost.create.mockResolvedValue({ _id: "p1", body: "Hi", createdAt: "now" });
    ClubMembership.find.mockImplementation(() => { throw new Error("db down"); });
    const res = mockRes();
    await createClubPost({ params: { id: CLUB }, body: { body: "Hi" }, user }, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
