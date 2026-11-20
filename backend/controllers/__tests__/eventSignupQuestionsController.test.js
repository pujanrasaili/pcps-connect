jest.mock("../../models/Event");
jest.mock("../../utils/audit");
jest.mock("../../models/Registration");
jest.mock("../../utils/inApp");
jest.mock("../../utils/clubAccess");

const Event = require("../../models/Event");
const Registration = require("../../models/Registration");
const { pushNotifications } = require("../../utils/inApp");
const { recordAudit } = require("../../utils/audit");
const { canManageEvent } = require("../../utils/clubAccess");
const { setSignupQuestions, remindMissingAnswers } = require("../eventSignupQuestionsController");

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

  describe("telling people who already signed up", () => {
    const FUTURE = new Date(Date.now() + 864e5);
    const setup = (event) => {
      Event.findById.mockResolvedValue({ _id: "ev1", title: "Hack Night", date: FUTURE, save: jest.fn().mockResolvedValue(), ...event });
      canManageEvent.mockResolvedValue(true);
      Registration.find.mockReturnValue({ distinct: jest.fn().mockResolvedValue(["s1", "s2"]) });
    };

    it("sends a bell message when a new required question is added", async () => {
      setup({ signupQuestions: [] });
      const res = mockRes();
      await setSignupQuestions(req({ questions: [{ text: "Phone?", required: true }] }), res);
      expect(pushNotifications).toHaveBeenCalledWith(["s1", "s2"], expect.objectContaining({ type: "event_answers_needed", title: "A new question was added to Hack Night", link: "/events/ev1" }));
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("stays quiet for optional questions, unchanged questions and past events", async () => {
      setup({ signupQuestions: [] });
      await setSignupQuestions(req({ questions: [{ text: "Notes?", required: false }] }), mockRes());
      setup({ signupQuestions: [{ text: "Phone?", required: true }] });
      await setSignupQuestions(req({ questions: [{ text: "Phone?", required: true }] }), mockRes());
      setup({ signupQuestions: [], date: new Date(Date.now() - 864e5) });
      await setSignupQuestions(req({ questions: [{ text: "Phone?", required: true }] }), mockRes());
      expect(pushNotifications).not.toHaveBeenCalled();
    });

    it("still saves when the notification fails", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      setup({ signupQuestions: [] });
      pushNotifications.mockRejectedValue(new Error("down"));
      const res = mockRes();
      await setSignupQuestions(req({ questions: [{ text: "Phone?", required: true }] }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});

describe("remindMissingAnswers", () => {
  const FUTURE = new Date(Date.now() + 864e5);
  const QS = [{ text: "Phone?", required: true }, { text: "Notes?", required: false }];
  const setup = (event, registrations = []) => {
    Event.findById.mockResolvedValue(event && { _id: "ev1", title: "Hack Night", date: FUTURE, signupQuestions: QS, ...event });
    canManageEvent.mockResolvedValue(true);
    Registration.find.mockReturnValue({ select: jest.fn().mockResolvedValue(registrations) });
  };
  const call = async () => {
    const res = mockRes();
    await remindMissingAnswers({ params: { id: "ev1" }, user: { _id: "u1" } }, res);
    return res;
  };

  it("404s for an unknown event and 403s for someone who doesn't organise it", async () => {
    setup(null);
    expect((await call()).status).toHaveBeenCalledWith(404);
    setup({});
    canManageEvent.mockResolvedValue(false);
    expect((await call()).status).toHaveBeenCalledWith(403);
  });

  it("refuses past events and events with no required questions", async () => {
    setup({ date: new Date(Date.now() - 1000) });
    expect((await call()).status).toHaveBeenCalledWith(400);
    setup({ signupQuestions: [{ text: "Notes?", required: false }] });
    expect((await call()).status).toHaveBeenCalledWith(400);
    expect(pushNotifications).not.toHaveBeenCalled();
  });

  it("messages only the students who still owe a required answer", async () => {
    setup({}, [
      { user: "s1", answers: [] },
      { user: "s2", answers: [{ question: "Phone?", answer: "98" }] },
      { user: "s3", answers: [{ question: "Notes?", answer: "hi" }] },
    ]);
    pushNotifications.mockResolvedValue(2);
    const res = await call();
    expect(pushNotifications).toHaveBeenCalledWith(["s1", "s3"], expect.objectContaining({ type: "event_answers_needed", link: "/events/ev1", title: "Please answer the sign-up questions for Hack Night" }));
    expect(recordAudit).toHaveBeenCalledWith({ _id: "u1" }, "event.remindAnswers", expect.stringContaining("Hack Night"));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Reminder sent to 2 student(s)", sent: 2 });
  });

  it("500s cleanly when the database fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    Event.findById.mockRejectedValue(new Error("db"));
    expect((await call()).status).toHaveBeenCalledWith(500);
  });
});
