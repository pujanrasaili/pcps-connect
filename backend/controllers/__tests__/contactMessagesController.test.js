jest.mock("../../models/ContactMessage");
jest.mock("../../utils/audit");

const ContactMessage = require("../../models/ContactMessage");
const { recordAudit } = require("../../utils/audit");
const { getContactMessages, setMessageHandled, deleteContactMessage } = require("../contactMessagesController");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

afterEach(() => jest.clearAllMocks());

describe("contact messages (admin inbox)", () => {
  it("lists messages newest first with an unhandled count", async () => {
    const msgs = [{ name: "A", handled: false }, { name: "B", handled: true }];
    const q = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue(msgs) };
    ContactMessage.find.mockReturnValue(q);
    ContactMessage.countDocuments.mockResolvedValue(1);
    const res = mockRes();
    await getContactMessages({}, res);
    expect(q.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res.json).toHaveBeenCalledWith({ messages: msgs, unhandled: 1 });
  });

  it("400s when handled is not a boolean", async () => {
    const res = mockRes();
    await setMessageHandled({ params: { id: "1" }, body: { handled: "yes" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("404s when the message is missing", async () => {
    ContactMessage.findByIdAndUpdate.mockResolvedValue(null);
    const res = mockRes();
    await setMessageHandled({ params: { id: "1" }, body: { handled: true } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("marks a message handled", async () => {
    ContactMessage.findByIdAndUpdate.mockResolvedValue({ name: "A", handled: true });
    const res = mockRes();
    await setMessageHandled({ params: { id: "1" }, body: { handled: true } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("deletes and audits", async () => {
    ContactMessage.findByIdAndDelete.mockResolvedValue({ name: "Sita" });
    const res = mockRes();
    await deleteContactMessage({ params: { id: "1" }, user: { _id: "u" } }, res);
    expect(recordAudit).toHaveBeenCalledWith(expect.anything(), "contact.deleted", expect.stringContaining("Sita"));
  });

  it("400s when the request has no body at all", async () => {
    const res = mockRes();
    await setMessageHandled({ params: { id: "1" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  describe("when the database fails", () => {
    const boom = new Error("db down");
    let spy;
    beforeEach(() => { spy = jest.spyOn(console, "error").mockImplementation(() => {}); });
    afterEach(() => spy.mockRestore());

    it("500s when listing", async () => {
      ContactMessage.find.mockImplementation(() => { throw boom; });
      const res = mockRes();
      await getContactMessages({}, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("500s when updating", async () => {
      ContactMessage.findByIdAndUpdate.mockRejectedValue(boom);
      const res = mockRes();
      await setMessageHandled({ params: { id: "1" }, body: { handled: true } }, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("500s when deleting, and records nothing", async () => {
      ContactMessage.findByIdAndDelete.mockRejectedValue(boom);
      const res = mockRes();
      await deleteContactMessage({ params: { id: "1" }, user: { _id: "u" } }, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(recordAudit).not.toHaveBeenCalled();
    });
  });
});
