jest.mock("../../models/Event");
jest.mock("../../models/Club");
jest.mock("../../models/Registration");
jest.mock("../../models/WaitlistEntry");
jest.mock("../../models/EventQuestion");
jest.mock("../../models/EventVolunteer");
jest.mock("../../utils/notifyClubMembers");
jest.mock("../../utils/notifyInterested");
jest.mock("../../utils/notifyRegistrants");
jest.mock("../../utils/waitlist");
jest.mock("../../utils/audit");
jest.mock("../../utils/eventPhotoCleanup");
jest.mock("../../middleware/upload", () => ({ uploadBufferToCloudinary: jest.fn() }));

const Event = require("../../models/Event");
const Club = require("../../models/Club");
const Registration = require("../../models/Registration");
const { destroyEventPhotos } = require("../../utils/eventPhotoCleanup");
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

  it("delete: the event's photos are removed from storage too", async () => {
    const ev = { ...existing(A), photos: ["https://res.cloudinary.com/d/image/upload/v1/pcps-connect/event-photos/a.jpg"] };
    Event.findById.mockResolvedValue(ev);
    await deleteEvent({ params: { id: "ev1" }, user: LEADER }, mockRes());
    expect(destroyEventPhotos).toHaveBeenCalledWith(ev.photos);
  });
});

describe("co-hosted events", () => {
  const ADMIN = { _id: "admin1", role: "admin" };
  const C = "c".repeat(24);
  const D = "d".repeat(24);
  const E = "e".repeat(24);
  const existing = (club, coHosts = []) => ({ _id: "ev1", club, coHosts, save: jest.fn().mockResolvedValue(), deleteOne: jest.fn().mockResolvedValue() });

  it("a leader of a co-hosting club can edit the event", async () => {
    const ev = existing(B, [A]);
    Event.findById.mockResolvedValue(ev);
    const res = mockRes();
    await updateEvent({ params: { id: "ev1" }, body: { title: "Joint" }, user: LEADER }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(ev.title).toBe("Joint");
  });

  it("a co-host leader sending the unchanged main club is not refused", async () => {
    const ev = existing(B, [A]);
    Event.findById.mockResolvedValue(ev);
    const res = mockRes();
    await updateEvent({ params: { id: "ev1" }, body: { club: B, title: "Joint" }, user: LEADER }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("a co-host leader still cannot move the event to a club they don't lead", async () => {
    const ev = existing(B, [A]);
    Event.findById.mockResolvedValue(ev);
    const res = mockRes();
    await updateEvent({ params: { id: "ev1" }, body: { club: C }, user: LEADER }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(ev.save).not.toHaveBeenCalled();
  });

  it("a leader cannot add co-hosts themselves", async () => {
    const ev = existing(A);
    Event.findById.mockResolvedValue(ev);
    const res = mockRes();
    await updateEvent({ params: { id: "ev1" }, body: { coHosts: JSON.stringify([B]) }, user: LEADER }, res);
    expect(ev.coHosts).toEqual([]);
  });

  it("a leader's create ignores co-hosts", async () => {
    const res = mockRes();
    await createEvent({ body: { ...body, club: A, coHosts: JSON.stringify([B]) }, user: LEADER }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(Event.create.mock.calls[0][0].coHosts).toBeUndefined();
  });

  it("an admin can set co-hosts on create and update", async () => {
    Club.countDocuments.mockResolvedValue(2);
    const res = mockRes();
    await createEvent({ body: { ...body, club: A, coHosts: JSON.stringify([B, C]) }, user: ADMIN }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(Event.create.mock.calls[0][0].coHosts).toEqual([B, C]);

    const ev = existing(A);
    Event.findById.mockResolvedValue(ev);
    Club.countDocuments.mockResolvedValue(1);
    const res2 = mockRes();
    await updateEvent({ params: { id: "ev1" }, body: { coHosts: [D] }, user: ADMIN }, res2);
    expect(ev.coHosts).toEqual([D]);
  });

  it("drops the main club and repeats from the list, and an empty list clears it", async () => {
    const ev = existing(A, [B]);
    Event.findById.mockResolvedValue(ev);
    Club.countDocuments.mockResolvedValue(1);
    await updateEvent({ params: { id: "ev1" }, body: { coHosts: JSON.stringify([A, C, C]) }, user: ADMIN }, mockRes());
    expect(ev.coHosts).toEqual([C]);
    await updateEvent({ params: { id: "ev1" }, body: { coHosts: "" }, user: ADMIN }, mockRes());
    expect(ev.coHosts).toEqual([]);
  });

  it.each([
    ["more than two", JSON.stringify([B, C, D])],
    ["not a list", JSON.stringify({ a: 1 })],
    ["not JSON", "{oops"],
    ["bad ids", JSON.stringify(["nope"])],
  ])("400 for co-hosts that are %s", async (_l, coHosts) => {
    const res = mockRes();
    await createEvent({ body: { ...body, club: A, coHosts }, user: ADMIN }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Event.create).not.toHaveBeenCalled();
  });

  it("co-hosting clubs' members are notified after the main club", async () => {
    const { notifyNewClubEvent } = require("../../utils/notifyClubMembers");
    Club.countDocuments.mockResolvedValue(1);
    Club.find.mockResolvedValue([{ _id: B, name: "B" }]);
    const res = mockRes();
    await createEvent({ body: { ...body, club: A, coHosts: JSON.stringify([B]) }, user: ADMIN }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(notifyNewClubEvent).toHaveBeenCalledTimes(2);
    expect(notifyNewClubEvent.mock.calls[1][2]).toEqual({ exceptMembersOf: A });
  });

  it("announces the new event to students who follow its topic, skipping the hosting clubs' members", async () => {
    const { notifyInterestedStudents } = require("../../utils/notifyInterested");
    Club.countDocuments.mockResolvedValue(1);
    Club.find.mockResolvedValue([{ _id: B, name: "B" }]);
    const res = mockRes();
    await createEvent({ body: { ...body, club: A, coHosts: JSON.stringify([B]) }, user: ADMIN }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(notifyInterestedStudents).toHaveBeenCalledTimes(1);
    expect(notifyInterestedStudents.mock.calls[0][1]).toEqual([A, B]);
  });

  it("400 when a co-host club doesn't exist", async () => {
    Club.countDocuments.mockResolvedValue(0);
    const res = mockRes();
    await createEvent({ body: { ...body, club: A, coHosts: JSON.stringify([E]) }, user: ADMIN }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("a leader of a co-hosting club can delete the event", async () => {
    const ev = existing(B, [A]);
    Event.findById.mockResolvedValue(ev);
    const res = mockRes();
    await deleteEvent({ params: { id: "ev1" }, user: LEADER }, res);
    expect(ev.deleteOne).toHaveBeenCalled();
  });
});
