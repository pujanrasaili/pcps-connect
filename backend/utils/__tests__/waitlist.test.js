jest.mock("../../models/Registration");
jest.mock("../../models/WaitlistEntry");
jest.mock("../sendEmail");

const Registration = require("../../models/Registration");
const WaitlistEntry = require("../../models/WaitlistEntry");
const sendEmail = require("../sendEmail");
const { promoteFromWaitlist } = require("../waitlist");

const event = { _id: "ev1", title: "Hack Night", capacity: 10, date: new Date("2027-01-01"), location: "Lab" };
const entry = (n) => ({
  user: { _id: `u${n}`, name: `Student ${n}`, email: `s${n}@patancollege.edu.np` },
  createdAt: new Date(2026, 0, n),
});

// findOneAndDelete(...).populate(...) -- hand out the queued entries in order
function queue(...entries) {
  const list = [...entries];
  WaitlistEntry.findOneAndDelete.mockImplementation(() => ({
    populate: jest.fn().mockResolvedValue(list.shift() || null),
  }));
}

describe("promoteFromWaitlist", () => {
  beforeEach(() => {
    sendEmail.mockResolvedValue();
    Registration.create.mockResolvedValue({});
  });
  afterEach(() => jest.resetAllMocks());

  it("does nothing when the event has no free seats", async () => {
    Registration.countDocuments.mockResolvedValue(10);
    expect(await promoteFromWaitlist(event)).toBe(0);
    expect(WaitlistEntry.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("does nothing when nobody is waiting", async () => {
    Registration.countDocuments.mockResolvedValue(9);
    queue();
    expect(await promoteFromWaitlist(event)).toBe(0);
    expect(Registration.create).not.toHaveBeenCalled();
  });

  it("promotes the oldest waiting student into a registration and emails them", async () => {
    Registration.countDocuments.mockResolvedValueOnce(9).mockResolvedValue(10);
    queue(entry(1), entry(2));
    expect(await promoteFromWaitlist(event)).toBe(1);
    expect(Registration.create).toHaveBeenCalledTimes(1);
    expect(Registration.create).toHaveBeenCalledWith(expect.objectContaining({ user: "u1", event: "ev1" }));
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "s1@patancollege.edu.np", icalEvent: expect.stringContaining("BEGIN:VEVENT") }));
  });

  it("fills several open seats in order", async () => {
    Registration.countDocuments.mockResolvedValueOnce(8).mockResolvedValueOnce(9).mockResolvedValueOnce(10);
    queue(entry(1), entry(2), entry(3));
    expect(await promoteFromWaitlist(event)).toBe(2);
    expect(Registration.create.mock.calls.map((c) => c[0].user)).toEqual(["u1", "u2"]);
  });

  it("skips a waitlisted account that no longer exists and promotes the next one", async () => {
    Registration.countDocuments.mockResolvedValueOnce(9).mockResolvedValue(10);
    queue({ user: null, createdAt: new Date() }, entry(2));
    // two seats are needed to reach the second entry, so give it room
    Registration.countDocuments.mockReset();
    Registration.countDocuments.mockResolvedValueOnce(8).mockResolvedValue(9);
    expect(await promoteFromWaitlist(event)).toBe(1);
    expect(Registration.create).toHaveBeenCalledWith(expect.objectContaining({ user: "u2" }));
  });

  it("undoes the promotion and requeues the student if the seat was taken at the same instant", async () => {
    Registration.countDocuments.mockResolvedValueOnce(9).mockResolvedValue(11);
    queue(entry(1));
    expect(await promoteFromWaitlist(event)).toBe(0);
    expect(Registration.deleteOne).toHaveBeenCalledWith({ user: "u1", event: "ev1" });
    expect(WaitlistEntry.create).toHaveBeenCalledWith(expect.objectContaining({ user: "u1", event: "ev1" }));
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("still counts the promotion if the notification email fails", async () => {
    Registration.countDocuments.mockResolvedValueOnce(9).mockResolvedValue(10);
    queue(entry(1));
    sendEmail.mockRejectedValue(new Error("smtp down"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect(await promoteFromWaitlist(event)).toBe(1);
  });
});
