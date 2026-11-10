process.env.JWT_SECRET = "test-secret";

jest.mock("../../models/Registration");
jest.mock("../../models/EventVolunteer");

const Registration = require("../../models/Registration");
const EventVolunteer = require("../../models/EventVolunteer");
const { verifyCertificate } = require("../certificateController");
const { createCertificateCode, createVolunteerCertificateCode } = require("../../utils/certificateCode");
const { createCheckInCode } = require("../../utils/checkInCode");

const REG_ID = "a".repeat(24);

function populated(doc) {
  const q = { populate: jest.fn() };
  q.populate.mockReturnValue(q);
  q.then = (resolve) => resolve(doc);
  return q;
}
function call(code) {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return verifyCertificate({ params: { code } }, res).then(() => res);
}
const attended = (over = {}) => ({
  attended: true,
  user: { name: "Sita" },
  event: { title: "Hack Night", date: new Date("2027-01-01") },
  ...over,
});

describe("verifyCertificate", () => {
  afterEach(() => jest.clearAllMocks());

  it("confirms a genuine certificate and shows only what's printed on it", async () => {
    Registration.findById.mockReturnValue(populated(attended()));
    const res = await call(createCertificateCode(REG_ID));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      valid: true,
      student: { name: "Sita" },
      event: { title: "Hack Night", date: expect.any(Date) },
    });
  });

  it("rejects a forged code without touching the database", async () => {
    const res = await call(`${REG_ID}.forged`);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ valid: false });
    expect(Registration.findById).not.toHaveBeenCalled();
  });

  it("rejects a check-in code presented as a certificate", async () => {
    const res = await call(createCheckInCode(REG_ID));
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("is invalid if the student wasn't actually marked attended", async () => {
    Registration.findById.mockReturnValue(populated(attended({ attended: false })));
    const res = await call(createCertificateCode(REG_ID));
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("is invalid if the registration or event no longer exists", async () => {
    Registration.findById.mockReturnValue(populated(null));
    expect((await call(createCertificateCode(REG_ID))).status).toHaveBeenCalledWith(404);
    Registration.findById.mockReturnValue(populated(attended({ event: null })));
    expect((await call(createCertificateCode(REG_ID))).status).toHaveBeenCalledWith(404);
  });
});

describe("verifyCertificate -- volunteering certificates", () => {
  afterEach(() => jest.clearAllMocks());
  const helper = (over = {}) => ({
    attended: true,
    role: "r1",
    user: { name: "Ram" },
    event: { title: "Open Mic", date: new Date("2027-01-01"), volunteerRoles: [{ _id: "r1", name: "Registration desk" }] },
    ...over,
  });

  it("confirms a genuine one and shows the role", async () => {
    EventVolunteer.findById.mockReturnValue(populated(helper()));
    const res = await call(createVolunteerCertificateCode(REG_ID));
    expect(res.status).not.toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      valid: true,
      student: { name: "Ram" },
      event: { title: "Open Mic", date: new Date("2027-01-01") },
      volunteerRole: "Registration desk",
    });
  });
  it("rejects one whose helper was never marked as helped, or that no longer exists", async () => {
    EventVolunteer.findById.mockReturnValue(populated(helper({ attended: false })));
    expect((await call(createVolunteerCertificateCode(REG_ID))).status).toHaveBeenCalledWith(404);
    EventVolunteer.findById.mockReturnValue(populated(null));
    expect((await call(createVolunteerCertificateCode(REG_ID))).status).toHaveBeenCalledWith(404);
  });
  it("keeps the two kinds apart: an attendance code is not a volunteering code and vice versa", async () => {
    EventVolunteer.findById.mockReturnValue(populated(helper()));
    Registration.findById.mockReturnValue(populated(attended()));
    expect(EventVolunteer.findById).not.toHaveBeenCalled();
    const asVolunteer = await call(createCertificateCode(REG_ID));
    expect(asVolunteer.json).toHaveBeenCalledWith(expect.not.objectContaining({ volunteerRole: expect.anything() }));
    EventVolunteer.findById.mockClear();
    Registration.findById.mockClear();
    await call(createVolunteerCertificateCode(REG_ID));
    expect(Registration.findById).not.toHaveBeenCalled();
  });
});

