import { FaBell, FaCalendarAlt, FaUsers, FaPoll, FaRegCommentDots, FaStar, FaFlag, FaEnvelope, FaUserClock, FaLightbulb, FaNewspaper, FaHandsHelping, FaUserCheck } from "react-icons/fa";

// One small icon per kind of bell message, so the list can be scanned. Matching
// is by prefix/name of the stored notification type; anything unknown gets the bell.
const EXACT = {
  club_poll: FaPoll,
  club_poll_closing: FaPoll,
  club_news: FaNewspaper,
  club_idea: FaLightbulb,
  club_meetings: FaCalendarAlt,
  question_answered: FaRegCommentDots,
  feedback_request: FaStar,
  event_recap: FaStar,
  board_report: FaFlag,
  contact_message: FaEnvelope,
  account_pending: FaUserClock,
  waitlist_promoted: FaUserCheck,
  join_approved: FaUserCheck,
  club_join_approved: FaUserCheck,
  volunteer_reminder: FaHandsHelping,
  volunteer_role_full: FaHandsHelping,
};

export function notificationIcon(type = "") {
  if (EXACT[type]) return EXACT[type];
  if (type.startsWith("event") || type === "interest_event" || type === "saved_reminder") return FaCalendarAlt;
  if (type.includes("join") || type.startsWith("club")) return FaUsers;
  return FaBell;
}
