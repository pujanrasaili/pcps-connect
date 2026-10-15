jest.mock("../../utils/sendEmail");

const sendEmail = require("../../utils/sendEmail");
const { submitContactForm } = require("../contactController");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const valid = { name: "Sita", email: "sita@example.com", subject: "Hello", message: "Question about clubs" };

describe("submitContactForm", () => {
  afterEach(() => jest.clearAllMocks());

  it("sends the message and sets replyTo to the submitter", async () => {
    sendEmail.mockResolvedValue();
    const res = mockRes();
    await submitContactForm({ body: valid }, res);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ replyTo: "sita@example.com" }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("400s when a required field is missing", async () => {
    const res = mockRes();
    await submitContactForm({ body: { ...valid, message: "" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("400s (not 500) when a field is an object instead of a string", async () => {
    const res = mockRes();
    await submitContactForm({ body: { ...valid, name: { $gt: "" } } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("400s on a malformed email address", async () => {
    const res = mockRes();
    await submitContactForm({ body: { ...valid, email: "not-an-email" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("400s when the message is absurdly long", async () => {
    const res = mockRes();
    await submitContactForm({ body: { ...valid, message: "x".repeat(5001) } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("allows the subject to be omitted", async () => {
    sendEmail.mockResolvedValue();
    const { subject, ...noSubject } = valid;
    const res = mockRes();
    await submitContactForm({ body: noSubject }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
