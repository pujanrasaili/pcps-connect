jest.mock("../../models/Event");
jest.mock("../../models/Club");
jest.mock("../../models/Registration");
jest.mock("../../models/WaitlistEntry");
jest.mock("../../models/EventQuestion");
jest.mock("../../utils/notifyClubMembers");
jest.mock("../../utils/notifyRegistrants");
jest.mock("../../utils/waitlist");
jest.mock("../../utils/audit");
jest.mock("../../middleware/upload", () => ({ uploadBufferToCloudinary: jest.fn() }));

const Event = require("../../models/Event");
const Club = require("../../models/Club");
const Registration = require("../../models/Registration");
const { createEvent, updateEvent, deleteEvent } = require("../eventController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const A = "a".repeat(24);
const B = "b".repeat(24);
const LEADER = { _id: "leader1", role: "user" };
const body = { title: "T", description: "d", date: "2027-01-01T10:00", location: "Lab" };

beforeEach(() => {
  Registration.aggregate.mockResolvedValue([]);
  Event.create.mockImplementation(async (doc) => ({ _id: "ev1", ...doc }));
  Club.findById.mockImplementation(async (id) => ({ _id: id, name: id }));
  // leader1 leads club A only
  Club.exists.mockImplementation(async (q) => (q._id === A && q.leaders === "leader1" ? { _id: A } : null));
});
afterEach(() => jest.resetAllMocks());

describe("event rules for club leaders", () => {
  it("create: allowed for a club they lead", async () => {
    const res = mockRes();
    await createEvent({ body: { ...body, club: A }, user: LEADER }, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it.each([["another club", B], ["no club", ""]])("create: 403 for %s", async (_l, club) => {
    const res = mockRes();
    await createEvent({ body: { ...body, club }, user: LEADER }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(Event.create).not.toHaveBeenCalled();
  });

  const existing = (club) => ({ _id: "ev1", club, save: jest.fn().mockResolvedValue(), deleteOne: jest.fn().mockResolvedValue() });

  it("update: allowed on their own club's event", async () => {
    const ev = existing(A);
    Event.findById.mockResolvedValue(ev);
    const res = mockRes();
    await updateEvent({ params: { id: "ev1" }, body: { title: "New" }, user: LEADER }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(ev.title).toBe("New");
  });

  it("update: 403 on another club's event, nothing saved", async () => {
    const ev = existing(B);
    Event.findById.mockResolvedValue(ev);
    const res = mockRes();
    await updateEvent({ params: { id: "ev1" }, body: { title: "Hijack" }, user: LEADER }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(ev.save).not.toHaveBeenCalled();
  });

  it.each([["another club", B], ["no club", ""]])("update: can't move their event to %s", async (_l, club) => {
    const ev = existing(A);
    Event.findById.mockResolvedValue(ev);
    const res = mockRes();
    await updateEvent({ params: { id: "ev1" }, body: { club }, user: LEADER }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(ev.save).not.toHaveBeenCalled();
  });

  it("delete: allowed on own club's event, 403 on another's", async () => {
    const own = existing(A);
    Event.findById.mockResolvedValue(own);
    const ok = mockRes();
    await deleteEvent({ params: { id: "ev1" }, user: LEADER }, ok);
    expect(ok.status).toHaveBeenCalledWith(200);
    expect(own.deleteOne).toHaveBeenCalled();

    const other = existing(B);
    Event.findById.mockResolvedValue(other);
    const no = mockRes();
    await deleteEvent({ params: { id: "ev1" }, user: LEADER }, no);
    expect(no.status).toHaveBeenCalledWith(403);
    expect(other.deleteOne).not.toHaveBeenCalled();
  });

  it("a populated club object on the event is matched by its _id", async () => {
    const ev = existing({ _id: A, name: "Tech" });
    Event.findById.mockResolvedValue(ev);
    const res = mockRes();
    await deleteEvent({ params: { id: "ev1" }, user: LEADER }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
