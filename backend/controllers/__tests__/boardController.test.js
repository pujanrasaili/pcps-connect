jest.mock("../../models/BoardPost");
jest.mock("../../utils/audit");
jest.mock("../../utils/inApp");

const BoardPost = require("../../models/BoardPost");
const { recordAudit } = require("../../utils/audit");
const { notifyAdmins } = require("../../utils/inApp");
const { getBoard, createBoardPost, deleteBoardPost, reportBoardPost, resolveBoardPost } = require("../boardController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const student = { _id: "u1", name: "Sita Sharma", role: "student" };
const admin = { _id: "a1", name: "Admin", role: "admin" };
const body = { category: "found", title: "Keys", body: "Blue keyring", contact: "" };
afterEach(() => jest.resetAllMocks());

describe("getBoard", () => {
  const find = (rows) => ({ sort: () => ({ limit: () => ({ lean: async () => rows }) }) });
  it("returns only live posts, marks the reader's own and leaks no account", async () => {
    BoardPost.find.mockReturnValue(find([{ _id: "p1", author: "u1", authorName: "Sita", category: "lost", title: "t", body: "b", contact: "", createdAt: 1, expiresAt: 2 }, { _id: "p2", author: "u2", authorName: "Ram", category: "found", title: "t", body: "b", createdAt: 1, expiresAt: 2 }]));
    const res = mockRes();
    await getBoard({ user: student, query: {} }, res);
    const { posts } = res.json.mock.calls[0][0];
    expect(posts.map((p) => p.mine)).toEqual([true, false]);
    expect(JSON.stringify(posts)).not.toContain('"author"');
    expect(BoardPost.find.mock.calls[0][0].expiresAt.$gt).toBeInstanceOf(Date);
  });
  it("filters by a known category and ignores an unknown one", async () => {
    BoardPost.find.mockReturnValue(find([]));
    await getBoard({ user: student, query: { category: "lost" } }, mockRes());
    expect(BoardPost.find.mock.calls[0][0].category).toBe("lost");
    await getBoard({ user: student, query: { category: { $ne: "x" } } }, mockRes());
    expect(BoardPost.find.mock.calls[1][0].category).toBeUndefined();
  });
  it("reports a failure", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    BoardPost.find.mockImplementation(() => { throw new Error("boom"); });
    const res = mockRes();
    await getBoard({ user: student, query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("createBoardPost", () => {
  it("posts with the first name only and a 14 day expiry", async () => {
    BoardPost.countDocuments.mockResolvedValue(0);
    BoardPost.create.mockImplementation(async (d) => ({ _id: "p1", createdAt: 1, ...d }));
    const res = mockRes();
    await createBoardPost({ user: student, body }, res);
    const made = BoardPost.create.mock.calls[0][0];
    expect(made.authorName).toBe("Sita");
    expect(made.author).toBe("u1");
    const days = (made.expiresAt - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(13.99);
    expect(days).toBeLessThanOrEqual(14);
    expect(res.status).toHaveBeenCalledWith(201);
  });
  it("rejects bad input and a 4th live post", async () => {
    let res = mockRes();
    await createBoardPost({ user: student, body: { ...body, title: "" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    BoardPost.countDocuments.mockResolvedValue(3);
    res = mockRes();
    await createBoardPost({ user: student, body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(BoardPost.create).not.toHaveBeenCalled();
  });
  it("does not let the client choose the author, name or expiry", async () => {
    BoardPost.countDocuments.mockResolvedValue(0);
    BoardPost.create.mockImplementation(async (d) => ({ _id: "p1", ...d }));
    await createBoardPost({ user: student, body: { ...body, author: "x", authorName: "Evil", expiresAt: "2999-01-01" } }, mockRes());
    const made = BoardPost.create.mock.calls[0][0];
    expect(made.author).toBe("u1");
    expect(made.authorName).toBe("Sita");
    expect(made.expiresAt.getFullYear()).toBeLessThan(2999);
  });
});

describe("deleteBoardPost", () => {
  const post = (author) => ({ author, title: "Keys", deleteOne: jest.fn() });
  it("lets the author remove their own post without an audit entry", async () => {
    const p = post("u1");
    BoardPost.findById.mockResolvedValue(p);
    const res = mockRes();
    await deleteBoardPost({ user: student, params: { id: "p1" } }, res);
    expect(p.deleteOne).toHaveBeenCalled();
    expect(recordAudit).not.toHaveBeenCalled();
  });
  it("lets an admin remove anyone's post and logs it", async () => {
    const p = post("u2");
    BoardPost.findById.mockResolvedValue(p);
    await deleteBoardPost({ user: admin, params: { id: "p1" } }, mockRes());
    expect(p.deleteOne).toHaveBeenCalled();
    expect(recordAudit).toHaveBeenCalled();
  });
  it("refuses another student, and 404s a missing post", async () => {
    const p = post("u2");
    BoardPost.findById.mockResolvedValue(p);
    let res = mockRes();
    await deleteBoardPost({ user: student, params: { id: "p1" } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(p.deleteOne).not.toHaveBeenCalled();
    BoardPost.findById.mockResolvedValue(null);
    res = mockRes();
    await deleteBoardPost({ user: student, params: { id: "p1" } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("reporting", () => {
  const find = (rows) => ({ sort: () => ({ limit: () => ({ lean: async () => rows }) }) });
  const future = new Date(Date.now() + 86400000);
  const live = (author) => ({ _id: "p1", author, title: "Keys", expiresAt: future });
  it("hides heavily reported posts from students but not from admins, who also see the count", async () => {
    BoardPost.find.mockReturnValue(find([{ _id: "p1", author: "u2", authorName: "Ram", category: "found", title: "t", body: "b", reports: ["a", "b"] }]));
    await getBoard({ user: student, query: {} }, mockRes());
    expect(BoardPost.find.mock.calls[0][0].$expr).toBeDefined();
    const res = mockRes();
    await getBoard({ user: admin, query: {} }, res);
    expect(BoardPost.find.mock.calls[1][0].$expr).toBeUndefined();
    expect(res.json.mock.calls[0][0].posts[0].reportCount).toBe(2);
    const studentRes = mockRes();
    await getBoard({ user: student, query: {} }, studentRes);
    expect(studentRes.json.mock.calls[0][0].posts[0].reportCount).toBeUndefined();
  });
  it("records a first report and tells the admins", async () => {
    BoardPost.findById.mockResolvedValue(live("u2"));
    BoardPost.findOneAndUpdate.mockResolvedValue({ reports: ["u1"] });
    const res = mockRes();
    await reportBoardPost({ user: student, params: { id: "p1" } }, res);
    expect(BoardPost.findOneAndUpdate.mock.calls[0][0].reports).toEqual({ $ne: "u1" });
    expect(notifyAdmins).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it("stays quiet on a second report, and tells the admins again when the post gets hidden", async () => {
    BoardPost.findById.mockResolvedValue(live("u2"));
    BoardPost.findOneAndUpdate.mockResolvedValue({ reports: ["a", "u1"] });
    await reportBoardPost({ user: student, params: { id: "p1" } }, mockRes());
    expect(notifyAdmins).not.toHaveBeenCalled();
    BoardPost.findOneAndUpdate.mockResolvedValue({ reports: ["a", "b", "u1"] });
    await reportBoardPost({ user: student, params: { id: "p1" } }, mockRes());
    expect(notifyAdmins).toHaveBeenCalledTimes(1);
  });
  it("does nothing when this student already reported it", async () => {
    BoardPost.findById.mockResolvedValue(live("u2"));
    BoardPost.findOneAndUpdate.mockResolvedValue(null);
    const res = mockRes();
    await reportBoardPost({ user: student, params: { id: "p1" } }, res);
    expect(notifyAdmins).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it("refuses your own post and answers 404 for a missing or expired one", async () => {
    BoardPost.findById.mockResolvedValue(live("u1"));
    let res = mockRes();
    await reportBoardPost({ user: student, params: { id: "p1" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    BoardPost.findById.mockResolvedValue({ ...live("u2"), expiresAt: new Date(Date.now() - 1000) });
    res = mockRes();
    await reportBoardPost({ user: student, params: { id: "p1" } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    BoardPost.findById.mockResolvedValue(null);
    res = mockRes();
    await reportBoardPost({ user: student, params: { id: "p1" } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(BoardPost.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe("resolveBoardPost", () => {
  const mk = (over = {}) => ({ author: "u1", category: "lost", resolved: false, expiresAt: new Date(Date.now() + 10 * 86400000), save: jest.fn(), ...over });
  it("marks the author's lost post resolved and shortens its life to 2 days", async () => {
    const p = mk();
    BoardPost.findById.mockResolvedValue(p);
    const res = mockRes();
    await resolveBoardPost({ user: student, params: { id: "p1" } }, res);
    expect(p.resolved).toBe(true);
    expect((p.expiresAt - Date.now()) / 86400000).toBeLessThanOrEqual(2);
    expect(p.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it("never makes a post last longer than it already would", async () => {
    const soon = new Date(Date.now() + 3600000);
    const p = mk({ expiresAt: soon });
    BoardPost.findById.mockResolvedValue(p);
    await resolveBoardPost({ user: student, params: { id: "p1" } }, mockRes());
    expect(p.expiresAt).toBe(soon);
  });
  it("is a no-op the second time", async () => {
    const p = mk({ resolved: true });
    BoardPost.findById.mockResolvedValue(p);
    await resolveBoardPost({ user: student, params: { id: "p1" } }, mockRes());
    expect(p.save).not.toHaveBeenCalled();
  });
  it("refuses other people, general notices, and missing or expired posts", async () => {
    BoardPost.findById.mockResolvedValue(mk({ author: "u2" }));
    let res = mockRes();
    await resolveBoardPost({ user: student, params: { id: "p1" } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    BoardPost.findById.mockResolvedValue(mk({ category: "notice" }));
    res = mockRes();
    await resolveBoardPost({ user: student, params: { id: "p1" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    BoardPost.findById.mockResolvedValue(mk({ expiresAt: new Date(Date.now() - 1000) }));
    res = mockRes();
    await resolveBoardPost({ user: student, params: { id: "p1" } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    BoardPost.findById.mockResolvedValue(null);
    res = mockRes();
    await resolveBoardPost({ user: student, params: { id: "p1" } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
