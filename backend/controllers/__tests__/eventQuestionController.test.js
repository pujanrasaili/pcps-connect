jest.mock("../../models/Event");
jest.mock("../../models/EventQuestion");
jest.mock("../../models/User");
jest.mock("../../utils/audit");
jest.mock("../../utils/clubAccess");
jest.mock("../../utils/notifyQuestion");

const Event = require("../../models/Event");
const EventQuestion = require("../../models/EventQuestion");
const User = require("../../models/User");
const { recordAudit } = require("../../utils/audit");
const { canManageEvent } = require("../../utils/clubAccess");
const { notifyOrganiserOfQuestion, notifyAskerOfAnswer } = require("../../utils/notifyQuestion");
const { getQuestions, askQuestion, answerQuestion, deleteQuestion } = require("../eventQuestionController");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
const EV = "e".repeat(24);
const QID = "q".repeat(24);
const student = { _id: "u1", name: "Sita Kumari Rai" };
const future = () => new Date(Date.now() + 86400000);
const selectOf = (value) => ({ select: jest.fn().mockResolvedValue(value) });

afterEach(() => jest.resetAllMocks());

describe("getQuestions", () => {
  it("never exposes the asker's account id, and flags the viewer's own questions", async () => {
    const lean = jest.fn().mockResolvedValue([
      { _id: "1", author: "u1", authorName: "Sita", question: "Q1", answer: "", createdAt: "t" },
      { _id: "2", author: "other", authorName: "Ram", question: "Q2", answer: "A2", answeredByName: "Org", createdAt: "t" },
    ]);
    EventQuestion.find.mockReturnValue({ sort: () => ({ limit: () => ({ lean }) }) });
    const res = mockRes();
    await getQuestions({ params: { id: EV }, user: student }, res);
    const { questions } = res.json.mock.calls[0][0];
    expect(questions.map((q) => q.mine)).toEqual([true, false]);
    expect(questions.every((q) => !("author" in q))).toBe(true);
  });

  it("works for a visitor who is not logged in", async () => {
    const lean = jest.fn().mockResolvedValue([{ _id: "1", author: "u1", authorName: "Sita", question: "Q", createdAt: "t" }]);
    EventQuestion.find.mockReturnValue({ sort: () => ({ limit: () => ({ lean }) }) });
    const res = mockRes();
    await getQuestions({ params: { id: EV } }, res);
    expect(res.json.mock.calls[0][0].questions[0].mine).toBe(false);
  });
});

describe("askQuestion", () => {
  const event = () => ({ _id: EV, title: "Hack Night", date: future(), club: null, createdBy: "org1" });
  beforeEach(() => {
    Event.findById.mockReturnValue(selectOf(event()));
    EventQuestion.countDocuments.mockResolvedValue(0);
    EventQuestion.create.mockImplementation(async (doc) => ({ _id: "new", ...doc, createdAt: "t" }));
    User.findById.mockReturnValue(selectOf({ name: "Organiser", email: "org@x.np" }));
  });

  it("saves only the first name, emails the organiser and answers 201", async () => {
    const res = mockRes();
    await askQuestion({ params: { id: EV }, body: { question: " Is food free? " }, user: student }, res);
    expect(EventQuestion.create).toHaveBeenCalledWith({ event: EV, author: "u1", authorName: "Sita", question: "Is food free?" });
    expect(notifyOrganiserOfQuestion).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].question).not.toHaveProperty("author");
  });

  it("does not email an organiser about their own question", async () => {
    const res = mockRes();
    await askQuestion({ params: { id: EV }, body: { question: "Testing 123" }, user: { _id: "org1", name: "Org" } }, res);
    expect(notifyOrganiserOfQuestion).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("404s for a missing event and refuses a past one", async () => {
    Event.findById.mockReturnValue(selectOf(null));
    let res = mockRes();
    await askQuestion({ params: { id: EV }, body: { question: "Hello there" }, user: student }, res);
    expect(res.status).toHaveBeenCalledWith(404);

    Event.findById.mockReturnValue(selectOf({ ...event(), date: new Date(Date.now() - 86400000) }));
    res = mockRes();
    await askQuestion({ params: { id: EV }, body: { question: "Hello there" }, user: student }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(EventQuestion.create).not.toHaveBeenCalled();
  });

  it("400s on bad text and when the student already has 3 open questions", async () => {
    let res = mockRes();
    await askQuestion({ params: { id: EV }, body: { question: "x" }, user: student }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    EventQuestion.countDocuments.mockResolvedValue(3);
    res = mockRes();
    await askQuestion({ params: { id: EV }, body: { question: "A fourth question" }, user: student }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/3 unanswered/);
    expect(EventQuestion.create).not.toHaveBeenCalled();
  });
});

describe("answerQuestion", () => {
  const event = { _id: EV, title: "Hack Night", club: "c1", createdBy: "org1" };
  const organiser = { _id: "org1", name: "Ram Organiser" };
  const makeQuestion = (extra = {}) => ({ _id: QID, author: "u1", question: "Is food free?", answer: "", save: jest.fn().mockResolvedValue(), ...extra });
  beforeEach(() => Event.findById.mockReturnValue(selectOf(event)));

  it("refuses someone who doesn't manage the event, before reading the question", async () => {
    canManageEvent.mockResolvedValue(false);
    const res = mockRes();
    await answerQuestion({ params: { id: EV, questionId: QID }, body: { answer: "Yes" }, user: student }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(EventQuestion.findOne).not.toHaveBeenCalled();
  });

  it("saves the first answer, records it and emails the asker", async () => {
    canManageEvent.mockResolvedValue(true);
    const q = makeQuestion();
    EventQuestion.findOne.mockResolvedValue(q);
    User.findById.mockReturnValue(selectOf({ name: "Sita", email: "sita@x.np" }));
    const res = mockRes();
    await answerQuestion({ params: { id: EV, questionId: QID }, body: { answer: " Yes, free lunch. " }, user: organiser }, res);
    expect(EventQuestion.findOne).toHaveBeenCalledWith({ _id: QID, event: EV });
    expect(q.answer).toBe("Yes, free lunch.");
    expect(q.answeredByName).toBe("Ram");
    expect(q.save).toHaveBeenCalled();
    expect(recordAudit).toHaveBeenCalledWith(organiser, "event.questionAnswered", 'Answered a question on "Hack Night"');
    expect(notifyAskerOfAnswer).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("does not email the asker again when an answer is only edited", async () => {
    canManageEvent.mockResolvedValue(true);
    EventQuestion.findOne.mockResolvedValue(makeQuestion({ answer: "Old answer" }));
    const res = mockRes();
    await answerQuestion({ params: { id: EV, questionId: QID }, body: { answer: "Better answer" }, user: organiser }, res);
    expect(notifyAskerOfAnswer).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("400s on an empty answer and 404s when the question isn't on this event", async () => {
    canManageEvent.mockResolvedValue(true);
    let res = mockRes();
    await answerQuestion({ params: { id: EV, questionId: QID }, body: { answer: "  " }, user: organiser }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    EventQuestion.findOne.mockResolvedValue(null);
    res = mockRes();
    await answerQuestion({ params: { id: EV, questionId: QID }, body: { answer: "Yes" }, user: organiser }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("deleteQuestion", () => {
  it("lets the asker delete their own question without any audit entry", async () => {
    const q = { author: "u1", deleteOne: jest.fn().mockResolvedValue() };
    EventQuestion.findOne.mockResolvedValue(q);
    const res = mockRes();
    await deleteQuestion({ params: { id: EV, questionId: QID }, user: student }, res);
    expect(q.deleteOne).toHaveBeenCalled();
    expect(recordAudit).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("lets an organiser delete someone else's question and records it", async () => {
    const q = { author: "someone", deleteOne: jest.fn().mockResolvedValue() };
    EventQuestion.findOne.mockResolvedValue(q);
    Event.findById.mockReturnValue(selectOf({ title: "Hack Night", club: "c1" }));
    canManageEvent.mockResolvedValue(true);
    const res = mockRes();
    await deleteQuestion({ params: { id: EV, questionId: QID }, user: { _id: "org1", name: "Org" } }, res);
    expect(q.deleteOne).toHaveBeenCalled();
    expect(recordAudit).toHaveBeenCalledWith(expect.anything(), "event.questionDeleted", 'Deleted a question on "Hack Night"');
  });

  it("refuses a stranger and 404s a missing question", async () => {
    const q = { author: "someone", deleteOne: jest.fn() };
    EventQuestion.findOne.mockResolvedValue(q);
    Event.findById.mockReturnValue(selectOf({ title: "Hack Night", club: "c1" }));
    canManageEvent.mockResolvedValue(false);
    let res = mockRes();
    await deleteQuestion({ params: { id: EV, questionId: QID }, user: student }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(q.deleteOne).not.toHaveBeenCalled();

    EventQuestion.findOne.mockResolvedValue(null);
    res = mockRes();
    await deleteQuestion({ params: { id: EV, questionId: QID }, user: student }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
