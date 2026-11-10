jest.mock("../../models/Registration");
jest.mock("../../models/EventVolunteer");
jest.mock("../../models/ClubMembership");

const Registration = require("../../models/Registration");
const EventVolunteer = require("../../models/EventVolunteer");
const ClubMembership = require("../../models/ClubMembership");
const { getMyRecord } = require("../recordController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const user = { _id: "u1", name: "Sita Sharma", studentId: "S1", program: "BCA" };
const populated = (rows) => ({ populate: () => rows });
afterEach(() => jest.resetAllMocks());

describe("getMyRecord", () => {
  it("lists only attended events and helped roles, newest first, with the clubs sorted", async () => {
    Registration.find.mockReturnValue(populated([
      { event: { title: "Old", date: "2030-01-01", club: { name: "Tech" } } },
      { event: { title: "New", date: "2030-03-01", club: null } },
      { event: null },
    ]));
    EventVolunteer.find.mockReturnValue(populated([{ role: "r1", event: { title: "Fest", date: "2030-02-01", volunteerRoles: [{ _id: "r1", name: "Usher" }] } }, { event: null }]));
    ClubMembership.find.mockReturnValue(populated([{ club: { name: "Music" } }, { club: { name: "Art" } }, { club: null }]));
    const res = mockRes();
    await getMyRecord({ user }, res);
    const { record } = res.json.mock.calls[0][0];
    expect(record.attended.map((e) => e.title)).toEqual(["New", "Old"]);
    expect(record.attended[1].club).toBe("Tech");
    expect(record.helped).toEqual([{ title: "Fest", date: "2030-02-01", role: "Usher" }]);
    expect(record.clubs).toEqual(["Art", "Music"]);
    expect(record).toMatchObject({ studentName: "Sita Sharma", studentId: "S1", program: "BCA" });
  });
  it("asks only for the logged-in student's confirmed attendance", async () => {
    Registration.find.mockReturnValue(populated([]));
    EventVolunteer.find.mockReturnValue(populated([]));
    ClubMembership.find.mockReturnValue(populated([]));
    await getMyRecord({ user }, mockRes());
    expect(Registration.find).toHaveBeenCalledWith({ user: "u1", attended: true });
    expect(EventVolunteer.find).toHaveBeenCalledWith({ user: "u1", attended: true });
    expect(ClubMembership.find).toHaveBeenCalledWith({ user: "u1" });
  });
  it("reports a failure", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    Registration.find.mockImplementation(() => { throw new Error("boom"); });
    const res = mockRes();
    await getMyRecord({ user }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
