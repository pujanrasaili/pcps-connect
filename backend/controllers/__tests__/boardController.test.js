jest.mock("../../models/BoardPost");
jest.mock("../../utils/audit");

const BoardPost = require("../../models/BoardPost");
const { recordAudit } = require("../../utils/audit");
const { getBoard, createBoardPost, deleteBoardPost } = require("../boardController");

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
