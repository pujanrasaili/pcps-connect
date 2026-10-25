const Event = require("../models/Event");
const EventQuestion = require("../models/EventQuestion");
const User = require("../models/User");
const { canManageEvent } = require("../utils/clubAccess");
const { cleanQuestion, cleanAnswer, firstName, MAX_OPEN_PER_STUDENT } = require("../utils/questionInput");
const { notifyOrganiserOfQuestion, notifyAskerOfAnswer } = require("../utils/notifyQuestion");
const { recordAudit } = require("../utils/audit");
const { safeError } = require("../utils/errorMessage");

const PAGE = 50;

// What the public (and the page) gets for one question. The asker's account id
// never leaves the server; `mine` just tells THEM which one is theirs.
function publicQuestion(row, viewerId) {
  return {
    _id: row._id,
    authorName: row.authorName,
    question: row.question,
    answer: row.answer || "",
    answeredByName: row.answeredByName || "",
    answeredAt: row.answeredAt || null,
    createdAt: row.createdAt,
    mine: !!viewerId && String(row.author) === String(viewerId),
  };
}

// GET /api/events/:id/questions  (public; a logged-in viewer also learns which are theirs)
async function getQuestions(req, res) {
  try {
    const rows = await EventQuestion.find({ event: req.params.id }).sort({ createdAt: -1 }).limit(PAGE).lean();
    res.status(200).json({ questions: rows.map((r) => publicQuestion(r, req.user?._id)) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch questions") });
  }
}

// POST /api/events/:id/questions  (requires login)
async function askQuestion(req, res) {
  try {
    const event = await Event.findById(req.params.id).select("title date club createdBy");
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (new Date(event.date) < new Date()) {
      return res.status(400).json({ message: "This event has already taken place, so it no longer takes questions" });
    }

    const { value: question, error } = cleanQuestion(req.body);
    if (error) return res.status(400).json({ message: error });

    const open = await EventQuestion.countDocuments({ event: event._id, author: req.user._id, answer: "" });
    if (open >= MAX_OPEN_PER_STUDENT) {
      return res.status(400).json({
        message: `You already have ${MAX_OPEN_PER_STUDENT} unanswered questions on this event. Please wait for an answer first.`,
      });
    }

    const authorName = firstName(req.user.name);
    const created = await EventQuestion.create({ event: event._id, author: req.user._id, authorName, question });

    // Tell the organiser, unless they asked it themselves. Best effort.
    if (String(event.createdBy) !== String(req.user._id)) {
      const organiser = await User.findById(event.createdBy).select("name email");
      await notifyOrganiserOfQuestion(organiser, event, question, authorName);
    }

    res.status(201).json({ message: "Question posted", question: publicQuestion(created, req.user._id) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to post your question") });
  }
}

// PUT /api/events/:id/questions/:questionId/answer  (admin, or a leader of the event's club)
async function answerQuestion(req, res) {
  try {
    const event = await Event.findById(req.params.id).select("title club createdBy");
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!(await canManageEvent(req.user, event))) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }

    const { value: answer, error } = cleanAnswer(req.body);
    if (error) return res.status(400).json({ message: error });

    // Matching the event too: an organiser can't answer another event's question by id.
    const question = await EventQuestion.findOne({ _id: req.params.questionId, event: event._id });
    if (!question) return res.status(404).json({ message: "Question not found" });

    const firstAnswer = !question.answer;
    question.answer = answer;
    question.answeredByName = firstName(req.user.name);
    question.answeredAt = new Date();
    await question.save();

    await recordAudit(req.user, "event.questionAnswered", `Answered a question on "${event.title}"`);
    if (firstAnswer) {
      const asker = await User.findById(question.author).select("name email");
      await notifyAskerOfAnswer(asker, event, question.question, answer);
    }
    res.status(200).json({ message: "Answer saved", question: publicQuestion(question, null) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to save the answer") });
  }
}

// DELETE /api/events/:id/questions/:questionId  (the asker, or an admin / the event's club leader)
async function deleteQuestion(req, res) {
  try {
    const question = await EventQuestion.findOne({ _id: req.params.questionId, event: req.params.id });
    if (!question) return res.status(404).json({ message: "Question not found" });

    const isAsker = String(question.author) === String(req.user._id);
    let manager = false;
    if (!isAsker) {
      const event = await Event.findById(req.params.id).select("title club createdBy");
      manager = !!event && (await canManageEvent(req.user, event));
      if (!manager) return res.status(403).json({ message: "Access denied: insufficient permissions" });
      await recordAudit(req.user, "event.questionDeleted", `Deleted a question on "${event.title}"`);
    }

    await question.deleteOne();
    res.status(200).json({ message: "Question deleted" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to delete the question") });
  }
}

module.exports = { getQuestions, askQuestion, answerQuestion, deleteQuestion };
