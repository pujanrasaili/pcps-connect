jest.mock("../../models/Event");
jest.mock("../../utils/audit");
jest.mock("../../utils/clubAccess");

const Event = require("../../models/Event");
const { recordAudit } = require("../../utils/audit");
const { canManageEvent } = require("../../utils/clubAccess");
const { setFeedbackQuestions } = require("../eventSignupQuestionsController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const req = (body) => ({ params: { id: "ev1" }, user: { _id: "u1" }, body });
beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

describe("setFeedbackQuestions", () => {
  it("404s for an unknown event and 403s for someone who doesn't organise it", async () => {
    Event.findById.mockResolvedValue(null);
    let res = mockRes();
    await setFeedbackQuestions(req({ questions: [] }), res);
    expect(res.status).toHaveBeenCalledWith(404);

    Event.findById.mockResolvedValue({ title: "T", save: jest.fn() });
    canManageEvent.mockResolvedValue(false);
    res = mockRes();
    await setFeedbackQuestions(req({ questions: [] }), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("400s on a bad list without saving", async () => {
    const event = { title: "T", save: jest.fn() };
    Event.findById.mockResolvedValue(event);
    canManageEvent.mockResolvedValue(true);
    for (const questions of ["no", ["ok?", ""], ["a?", "b?", "c?", "d?"], ["Same?", "same?"]]) {
      const res = mockRes();
      await setFeedbackQuestions(req({ questions }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(event.save).not.toHaveBeenCalled();
  });

  it("saves the questions and records who changed them", async () => {
    const event = { title: "Hack Night", save: jest.fn().mockResolvedValue() };
    Event.findById.mockResolvedValue(event);
    canManageEvent.mockResolvedValue(true);
    const res = mockRes();
    await setFeedbackQuestions(req({ questions: [" Was the venue easy to find? ", { text: "Food?" }] }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(event.feedbackQuestions).toEqual([{ text: "Was the venue easy to find?" }, { text: "Food?" }]);
    expect(event.save).toHaveBeenCalled();
    expect(recordAudit).toHaveBeenCalledWith({ _id: "u1" }, "event.feedbackQuestions", expect.stringContaining("2 feedback question"));
  });

  it("an empty list switches the questions off", async () => {
    const event = { title: "T", feedbackQuestions: [{ text: "Old?" }], save: jest.fn().mockResolvedValue() };
    Event.findById.mockResolvedValue(event);
    canManageEvent.mockResolvedValue(true);
    const res = mockRes();
    await setFeedbackQuestions(req({ questions: [] }), res);
    expect(event.feedbackQuestions).toEqual([]);
  });

  it("500s when saving fails", async () => {
    Event.findById.mockResolvedValue({ title: "T", save: jest.fn().mockRejectedValue(new Error("db")) });
    canManageEvent.mockResolvedValue(true);
    const res = mockRes();
    await setFeedbackQuestions(req({ questions: ["Ok?"] }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
