jest.mock("../../models/Event");
jest.mock("../../utils/audit");
jest.mock("../../utils/clubAccess");

const Event = require("../../models/Event");
const { recordAudit } = require("../../utils/audit");
const { canManageEvent } = require("../../utils/clubAccess");
const { setSignupQuestions } = require("../eventSignupQuestionsController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const req = (body) => ({ params: { id: "ev1" }, user: { _id: "u1" }, body });
afterEach(() => jest.resetAllMocks());

describe("setSignupQuestions", () => {
  it("404s for an unknown event and 403s for someone who doesn't organise it", async () => {
    Event.findById.mockResolvedValue(null);
    let res = mockRes();
    await setSignupQuestions(req({ questions: [] }), res);
    expect(res.status).toHaveBeenCalledWith(404);

    Event.findById.mockResolvedValue({ title: "T", save: jest.fn() });
    canManageEvent.mockResolvedValue(false);
    res = mockRes();
    await setSignupQuestions(req({ questions: [] }), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("400s on a bad list without saving", async () => {
    const event = { title: "T", save: jest.fn() };
    Event.findById.mockResolvedValue(event);
    canManageEvent.mockResolvedValue(true);
    const res = mockRes();
    await setSignupQuestions(req({ questions: "nope" }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(event.save).not.toHaveBeenCalled();
  });

  it("saves the cleaned questions and records it in the audit log", async () => {
    const event = { title: "Hack Night", save: jest.fn().mockResolvedValue() };
    Event.findById.mockResolvedValue(event);
    canManageEvent.mockResolvedValue(true);
    const res = mockRes();
    await setSignupQuestions(req({ questions: [{ text: " Size? ", required: true }] }), res);
    expect(event.signupQuestions).toEqual([{ text: "Size?", required: true }]);
    expect(event.save).toHaveBeenCalled();
    expect(recordAudit).toHaveBeenCalledWith({ _id: "u1" }, "event.signupQuestions", expect.stringContaining("Hack Night"));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("can switch the questions off", async () => {
    const event = { title: "T", signupQuestions: [{ text: "x" }], save: jest.fn().mockResolvedValue() };
    Event.findById.mockResolvedValue(event);
    canManageEvent.mockResolvedValue(true);
    await setSignupQuestions(req({ questions: [] }), mockRes());
    expect(event.signupQuestions).toEqual([]);
  });

  it("500s cleanly when the database fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    Event.findById.mockRejectedValue(new Error("db"));
    const res = mockRes();
    await setSignupQuestions(req({ questions: [] }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
