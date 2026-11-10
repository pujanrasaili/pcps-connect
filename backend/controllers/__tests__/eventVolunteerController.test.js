jest.mock("../../models/Event");
jest.mock("../../models/EventVolunteer");
jest.mock("../../utils/audit");
jest.mock("../../utils/clubAccess");
jest.mock("../../utils/inApp");

const Event = require("../../models/Event");
const EventVolunteer = require("../../models/EventVolunteer");
const { pushNotifications } = require("../../utils/inApp");
const { recordAudit } = require("../../utils/audit");
const { canManageEvent } = require("../../utils/clubAccess");
const { setHelperAttended, getMyCertificate, getVolunteers, signUp, cancelSignUp, setRoles } = require("../eventVolunteerController");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
const EV = "e".repeat(24);
const student = { _id: "u1", name: "Sita" };
const future = () => new Date(Date.now() + 86400000);
const selectOf = (v) => ({ select: jest.fn().mockResolvedValue(v) });
const populated = (rows) => ({ populate: () => ({ lean: () => Promise.resolve(rows) }) });
const event = (extra = {}) => ({ _id: EV, title: "Fest", date: future(), volunteerRoles: [{ _id: "r1", name: "Desk", slots: 2 }], ...extra });

afterEach(() => jest.resetAllMocks());

describe("getVolunteers", () => {
  it("shows counts and which role is mine, without names, to a student", async () => {
    Event.findById.mockReturnValue(selectOf(event()));
    canManageEvent.mockResolvedValue(false);
    EventVolunteer.find.mockReturnValue(populated([{ role: "r1", user: { _id: "u1", name: "Sita", email: "s@x" } }, { role: "r1", user: { _id: "u2", name: "Ram", email: "r@x" } }]));
    const res = mockRes();
    await getVolunteers({ params: { id: EV }, user: student }, res);
    const out = res.json.mock.calls[0][0];
    expect(out.mine).toBe("r1");
    expect(out.roles).toEqual([{ _id: "r1", name: "Desk", slots: 2, filled: 2 }]);
  });
  it("gives organisers the names and emails, and a visitor can look too", async () => {
    Event.findById.mockReturnValue(selectOf(event()));
    canManageEvent.mockResolvedValue(true);
    EventVolunteer.find.mockReturnValue(populated([{ role: "r1", user: { _id: "u2", name: "Ram", email: "r@x" } }]));
    const res = mockRes();
    await getVolunteers({ params: { id: EV }, user: { _id: "org" } }, res);
    expect(res.json.mock.calls[0][0].roles[0].volunteers).toEqual([{ userId: "u2", name: "Ram", email: "r@x", attended: false }]);
    EventVolunteer.find.mockReturnValue(populated([]));
    const res2 = mockRes();
    await getVolunteers({ params: { id: EV } }, res2);
    expect(res2.json.mock.calls[0][0].mine).toBeNull();
    expect(canManageEvent).toHaveBeenCalledTimes(1);
  });
  it("404 for an unknown event", async () => {
    Event.findById.mockReturnValue(selectOf(null));
    const res = mockRes();
    await getVolunteers({ params: { id: EV } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("signUp", () => {
  beforeEach(() => {
    Event.findById.mockReturnValue(selectOf(event()));
    EventVolunteer.exists.mockResolvedValue(null);
    EventVolunteer.countDocuments.mockResolvedValue(0);
    EventVolunteer.create.mockResolvedValue({});
  });
  it("signs the student up and answers 201", async () => {
    const res = mockRes();
    await signUp({ params: { id: EV }, body: { role: "r1" }, user: student }, res);
    expect(EventVolunteer.create).toHaveBeenCalledWith({ event: EV, user: "u1", role: "r1" });
    expect(res.status).toHaveBeenCalledWith(201);
  });
  it("tells the organiser when the last place of a role is taken, but not for other sign-ups or their own", async () => {
    Event.findById.mockReturnValue(selectOf(event({ createdBy: "org" })));
    EventVolunteer.countDocuments.mockResolvedValueOnce(1).mockResolvedValueOnce(2).mockResolvedValueOnce(2);
    await signUp({ params: { id: EV }, body: { role: "r1" }, user: student }, mockRes());
    expect(pushNotifications).toHaveBeenCalledWith(["org"], expect.objectContaining({ type: "volunteer_role_full", link: `/events/${EV}` }));
    expect(pushNotifications.mock.calls[0][1].title).toBe('All places are taken for "Desk" at Fest');

    pushNotifications.mockClear();
    EventVolunteer.countDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    await signUp({ params: { id: EV }, body: { role: "r1" }, user: student }, mockRes());
    expect(pushNotifications).not.toHaveBeenCalled();

    EventVolunteer.countDocuments.mockResolvedValueOnce(1).mockResolvedValueOnce(2).mockResolvedValueOnce(2);
    await signUp({ params: { id: EV }, body: { role: "r1" }, user: { _id: "org" } }, mockRes());
    expect(pushNotifications).not.toHaveBeenCalled();
  });
  it("refuses a past event, an unknown role, a second role and a full role", async () => {
    Event.findById.mockReturnValue(selectOf(event({ date: new Date(Date.now() - 1000) })));
    let res = mockRes();
    await signUp({ params: { id: EV }, body: { role: "r1" }, user: student }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    Event.findById.mockReturnValue(selectOf(event()));
    res = mockRes();
    await signUp({ params: { id: EV }, body: { role: "nope" }, user: student }, res);
    expect(res.status).toHaveBeenCalledWith(404);

    EventVolunteer.exists.mockResolvedValue({ _id: "x" });
    res = mockRes();
    await signUp({ params: { id: EV }, body: { role: "r1" }, user: student }, res);
    expect(res.json.mock.calls[0][0].message).toMatch(/already helping/);

    EventVolunteer.exists.mockResolvedValue(null);
    EventVolunteer.countDocuments.mockResolvedValue(2);
    res = mockRes();
    await signUp({ params: { id: EV }, body: { role: "r1" }, user: student }, res);
    expect(res.json.mock.calls[0][0].message).toBe("This role is full");
    expect(EventVolunteer.create).not.toHaveBeenCalled();
  });
  it("treats a duplicate-key race as 'already helping'", async () => {
    EventVolunteer.create.mockRejectedValue({ code: 11000 });
    const res = mockRes();
    await signUp({ params: { id: EV }, body: { role: "r1" }, user: student }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it("steps back out when a simultaneous tap took the last place", async () => {
    EventVolunteer.countDocuments.mockResolvedValueOnce(1).mockResolvedValueOnce(3);
    const res = mockRes();
    await signUp({ params: { id: EV }, body: { role: "r1" }, user: student }, res);
    expect(EventVolunteer.deleteOne).toHaveBeenCalledWith({ event: EV, user: "u1" });
    expect(res.json.mock.calls[0][0].message).toBe("This role is full");
  });
});

describe("cancelSignUp", () => {
  it("removes only the caller's own sign-up", async () => {
    EventVolunteer.findOneAndDelete.mockResolvedValue({ _id: "x" });
    const res = mockRes();
    await cancelSignUp({ params: { id: EV }, user: student }, res);
    expect(EventVolunteer.findOneAndDelete).toHaveBeenCalledWith({ event: EV, user: "u1" });
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it("404 when they weren't signed up", async () => {
    EventVolunteer.findOneAndDelete.mockResolvedValue(null);
    const res = mockRes();
    await cancelSignUp({ params: { id: EV }, user: student }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("setRoles", () => {
  const doc = () => ({ ...event(), save: jest.fn().mockResolvedValue() });
  const sortSelect = (rows) => ({ sort: () => ({ select: () => Promise.resolve(rows) }) });
  it("is for organisers only", async () => {
    Event.findById.mockResolvedValue(doc());
    canManageEvent.mockResolvedValue(false);
    const res = mockRes();
    await setRoles({ params: { id: EV }, body: { roles: [] }, user: student }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
  it("rejects bad input with 400 and saves nothing", async () => {
    const d = doc();
    Event.findById.mockResolvedValue(d);
    canManageEvent.mockResolvedValue(true);
    const res = mockRes();
    await setRoles({ params: { id: EV }, body: { roles: [{ name: "", slots: 1 }] }, user: student }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(d.save).not.toHaveBeenCalled();
  });
  it("keeps a renamed role's sign-ups, drops removed roles' sign-ups and treats unknown ids as new", async () => {
    const d = doc();
    d.volunteerRoles = [{ _id: "r1", name: "Desk", slots: 2 }, { _id: "r2", name: "Setup", slots: 2 }];
    Event.findById.mockResolvedValue(d);
    canManageEvent.mockResolvedValue(true);
    EventVolunteer.find.mockImplementation((q) => ("role" in q ? sortSelect([]) : populated([])));
    const res = mockRes();
    await setRoles({ params: { id: EV }, body: { roles: [{ _id: "r1", name: "Front desk", slots: 3 }, { _id: "zzz", name: "Cleanup", slots: 1 }] }, user: student }, res);
    expect(d.volunteerRoles).toEqual([{ _id: "r1", name: "Front desk", slots: 3 }, { name: "Cleanup", slots: 1 }]);
    expect(EventVolunteer.deleteMany).toHaveBeenCalledWith({ event: EV, role: { $in: ["r2"] } });
    expect(recordAudit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it("trims the latest sign-ups when a role shrinks below them", async () => {
    const d = doc();
    Event.findById.mockResolvedValue(d);
    canManageEvent.mockResolvedValue(true);
    EventVolunteer.find.mockImplementation((q) => ("role" in q ? sortSelect([{ _id: "a" }, { _id: "b" }]) : populated([])));
    const res = mockRes();
    await setRoles({ params: { id: EV }, body: { roles: [{ _id: "r1", name: "Desk", slots: 1 }] }, user: student }, res);
    expect(EventVolunteer.deleteMany).toHaveBeenCalledWith({ _id: { $in: ["b"] } });
  });
});

describe("getMyVolunteering", () => {
  const { getMyVolunteering } = require("../eventVolunteerController");
  it("lists only upcoming events, soonest first, with the role name", async () => {
    const mk = (id, days, roleName) => ({ role: "r1", event: id ? { _id: id, title: id, date: new Date(Date.now() + days * 86400000), location: "Hall", volunteerRoles: [{ _id: "r1", name: roleName }] } : null });
    EventVolunteer.find.mockReturnValue({ populate: () => Promise.resolve([mk("later", 9, "Desk"), mk("past", -2, "Desk"), mk(null), mk("soon", 2, "Setup")]) });
    const res = mockRes();
    await getMyVolunteering({ user: student }, res);
    expect(EventVolunteer.find).toHaveBeenCalledWith({ user: "u1" });
    expect(res.json.mock.calls[0][0].volunteering.map((v) => [v.event._id, v.role])).toEqual([["soon", "Setup"], ["later", "Desk"]]);
  });
});

describe("setHelperAttended", () => {
  const past = () => event({ date: new Date(Date.now() - 86400000) });
  const call = async (body, ev = past(), user = { _id: "org" }) => {
    Event.findById.mockReturnValue(selectOf(ev));
    const res = mockRes();
    await setHelperAttended({ params: { id: EV, userId: "u9" }, body, user }, res);
    return res;
  };
  it("lets an organiser mark a helper once the event has started", async () => {
    canManageEvent.mockResolvedValue(true);
    EventVolunteer.findOneAndUpdate.mockResolvedValue({ attended: true });
    const res = await call({ attended: true });
    expect(EventVolunteer.findOneAndUpdate).toHaveBeenCalledWith({ event: EV, user: "u9" }, { attended: true }, { new: true });
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it("refuses non-organisers, a non-boolean, a future event and an unknown helper", async () => {
    canManageEvent.mockResolvedValue(false);
    expect((await call({ attended: true })).status).toHaveBeenCalledWith(403);
    canManageEvent.mockResolvedValue(true);
    expect((await call({ attended: "yes" })).status).toHaveBeenCalledWith(400);
    expect((await call({ attended: true }, event())).status).toHaveBeenCalledWith(400);
    EventVolunteer.findOneAndUpdate.mockResolvedValue(null);
    expect((await call({ attended: true })).status).toHaveBeenCalledWith(404);
  });
});

describe("getMyCertificate", () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  const row = (over = {}) => ({
    _id: "a".repeat(24),
    attended: true,
    role: "r1",
    user: { name: "Ram", studentId: "S1", program: "BIT" },
    event: { title: "Open Mic", date: new Date("2027-01-01"), location: "Hall", club: { name: "Music Club" }, volunteerRoles: [{ _id: "r1", name: "Desk" }] },
    ...over,
  });
  const chain = (doc) => {
    const q = { populate: jest.fn() };
    q.populate.mockReturnValue(q);
    q.then = (resolve) => resolve(doc);
    return q;
  };
  it("returns the certificate with the role and a signed code once marked as helped", async () => {
    EventVolunteer.findOne.mockReturnValue(chain(row()));
    const res = mockRes();
    await getMyCertificate({ params: { id: EV }, user: student }, res);
    expect(EventVolunteer.findOne).toHaveBeenCalledWith({ event: EV, user: "u1" });
    const c = res.json.mock.calls[0][0].certificate;
    expect(c).toMatchObject({ studentName: "Ram", eventTitle: "Open Mic", clubName: "Music Club", role: "Desk" });
    expect(c.code).toMatch(/^[a-f0-9]{24}\./);
  });
  it("refuses when not signed up (404) or not marked as helped (400)", async () => {
    EventVolunteer.findOne.mockReturnValue(chain(null));
    let res = mockRes();
    await getMyCertificate({ params: { id: EV }, user: student }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    EventVolunteer.findOne.mockReturnValue(chain(row({ attended: false })));
    res = mockRes();
    await getMyCertificate({ params: { id: EV }, user: student }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

