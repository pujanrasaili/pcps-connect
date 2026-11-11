jest.mock("../../models/Event");
jest.mock("../../models/Registration");
jest.mock("../../utils/clubAccess");
jest.mock("../../utils/audit");

const Event = require("../../models/Event");
const Registration = require("../../models/Registration");
const { canManageEvent } = require("../../utils/clubAccess");
const { recordAudit } = require("../../utils/audit");
const { getJoinLink, setJoinLink } = require("../eventJoinLinkController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const user = { _id: "u1" };
const selecting = (doc) => ({ select: async () => doc });
afterEach(() => jest.resetAllMocks());

describe("getJoinLink", () => {
  it("gives the link to a student with a confirmed registration", async () => {
    Event.findById.mockReturnValue(selecting({ _id: "e1", joinLink: "https://zoom.us/j/1" }));
    canManageEvent.mockResolvedValue(false);
    Registration.exists.mockResolvedValue({ _id: "r1" });
    const res = mockRes();
    await getJoinLink({ user, params: { id: "e1" } }, res);
    expect(Registration.exists).toHaveBeenCalledWith({ event: "e1", user: "u1", status: "confirmed" });
    expect(res.json).toHaveBeenCalledWith({ link: "https://zoom.us/j/1" });
  });
  it("gives it to the organisers without needing a registration", async () => {
    Event.findById.mockReturnValue(selecting({ _id: "e1", joinLink: "" }));
    canManageEvent.mockResolvedValue(true);
    const res = mockRes();
    await getJoinLink({ user, params: { id: "e1" } }, res);
    expect(res.json).toHaveBeenCalledWith({ link: "" });
  });
  it("refuses anyone else, and 404s a missing event", async () => {
    Event.findById.mockReturnValue(selecting({ _id: "e1", joinLink: "https://zoom.us/j/1" }));
    canManageEvent.mockResolvedValue(false);
    Registration.exists.mockResolvedValue(null);
    let res = mockRes();
    await getJoinLink({ user, params: { id: "e1" } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain("zoom");
    Event.findById.mockReturnValue(selecting(null));
    res = mockRes();
    await getJoinLink({ user, params: { id: "e1" } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("setJoinLink", () => {
  beforeEach(() => Event.findById.mockReturnValue(selecting({ _id: "e1", title: "Hack" })));
  it("saves a valid link and logs it", async () => {
    canManageEvent.mockResolvedValue(true);
    const res = mockRes();
    await setJoinLink({ user, params: { id: "e1" }, body: { link: "https://zoom.us/j/1" } }, res);
    expect(Event.updateOne).toHaveBeenCalledWith({ _id: "e1" }, { joinLink: "https://zoom.us/j/1" });
    expect(recordAudit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it("removes the link when empty", async () => {
    canManageEvent.mockResolvedValue(true);
    await setJoinLink({ user, params: { id: "e1" }, body: { link: "" } }, mockRes());
    expect(Event.updateOne).toHaveBeenCalledWith({ _id: "e1" }, { joinLink: "" });
  });
  it("refuses a bad link and a non-organiser without saving", async () => {
    canManageEvent.mockResolvedValue(true);
    let res = mockRes();
    await setJoinLink({ user, params: { id: "e1" }, body: { link: "javascript:alert(1)" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    canManageEvent.mockResolvedValue(false);
    res = mockRes();
    await setJoinLink({ user, params: { id: "e1" }, body: { link: "https://zoom.us/j/1" } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(Event.updateOne).not.toHaveBeenCalled();
  });
});
