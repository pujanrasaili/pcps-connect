jest.mock("../../models/Event");
jest.mock("../../models/Club");
jest.mock("../../models/Registration");
jest.mock("../../models/WaitlistEntry");
jest.mock("../../utils/notifyClubMembers");
jest.mock("../../utils/notifyRegistrants");
jest.mock("../../utils/waitlist");
jest.mock("../../utils/audit");
jest.mock("../../middleware/upload", () => ({ uploadBufferToCloudinary: jest.fn() }));

const Event = require("../../models/Event");
const Club = require("../../models/Club");
const Registration = require("../../models/Registration");
const { notifyNewClubEvent } = require("../../utils/notifyClubMembers");
const { createEvent, updateEvent } = require("../eventController");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const CLUB_ID = "a".repeat(24);
const baseBody = { title: "Hack Night", description: "d", date: "2027-01-01T10:00", location: "Lab" };
const admin = { _id: "admin1", role: "admin" };

beforeEach(() => {
  Registration.aggregate.mockResolvedValue([]);
  Event.create.mockImplementation(async (doc) => ({ _id: "ev1", ...doc }));
});
afterEach(() => jest.resetAllMocks());

describe("createEvent -- club handling", () => {
  it("creates a club-less event without notifying anyone", async () => {
    const res = mockRes();
    await createEvent({ body: baseBody, user: admin }, res);
    expect(Event.create).toHaveBeenCalledWith(expect.objectContaining({ club: null }));
    expect(notifyNewClubEvent).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("treats an empty club field (cleared form select) as no club", async () => {
    const res = mockRes();
    await createEvent({ body: { ...baseBody, club: "" }, user: admin }, res);
    expect(Event.create).toHaveBeenCalledWith(expect.objectContaining({ club: null }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("links the club and notifies its members", async () => {
    const club = { _id: CLUB_ID, name: "Tech Club" };
    Club.findById.mockResolvedValue(club);
    const res = mockRes();
    await createEvent({ body: { ...baseBody, club: CLUB_ID }, user: admin }, res);
    expect(Event.create).toHaveBeenCalledWith(expect.objectContaining({ club: CLUB_ID }));
    expect(notifyNewClubEvent).toHaveBeenCalledWith(expect.objectContaining({ title: "Hack Night" }), club);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("400s on a malformed club id without touching the database", async () => {
    const res = mockRes();
    await createEvent({ body: { ...baseBody, club: "not-an-id" }, user: admin }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Club.findById).not.toHaveBeenCalled();
    expect(Event.create).not.toHaveBeenCalled();
  });

  it("400s when the club doesn't exist", async () => {
    Club.findById.mockResolvedValue(null);
    const res = mockRes();
    await createEvent({ body: { ...baseBody, club: CLUB_ID }, user: admin }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Event.create).not.toHaveBeenCalled();
  });
});

describe("updateEvent -- club handling", () => {
  function existingEvent() {
    return {
      _id: "ev1",
      createdBy: { toString: () => "admin1" },
      date: new Date("2027-01-01"),
      location: "Lab",
      club: null,
      save: jest.fn().mockResolvedValue(),
    };
  }

  it("can assign a club to an existing event (without re-emailing members)", async () => {
    const ev = existingEvent();
    Event.findById.mockResolvedValue(ev);
    Club.findById.mockResolvedValue({ _id: CLUB_ID, name: "Tech Club" });
    const res = mockRes();
    await updateEvent({ params: { id: "ev1" }, body: { club: CLUB_ID }, user: admin }, res);
    expect(ev.club).toBe(CLUB_ID);
    expect(notifyNewClubEvent).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("can clear the club", async () => {
    const ev = { ...existingEvent(), club: CLUB_ID };
    Event.findById.mockResolvedValue(ev);
    const res = mockRes();
    await updateEvent({ params: { id: "ev1" }, body: { club: "" }, user: admin }, res);
    expect(ev.club).toBeNull();
  });

  it("rejects a club that doesn't exist and saves nothing", async () => {
    const ev = existingEvent();
    Event.findById.mockResolvedValue(ev);
    Club.findById.mockResolvedValue(null);
    const res = mockRes();
    await updateEvent({ params: { id: "ev1" }, body: { club: CLUB_ID }, user: admin }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(ev.save).not.toHaveBeenCalled();
  });
});
