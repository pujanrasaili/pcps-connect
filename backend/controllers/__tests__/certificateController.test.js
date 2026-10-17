process.env.JWT_SECRET = "test-secret";

jest.mock("../../models/Registration");

const Registration = require("../../models/Registration");
const { verifyCertificate } = require("../certificateController");
const { createCertificateCode } = require("../../utils/certificateCode");
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
