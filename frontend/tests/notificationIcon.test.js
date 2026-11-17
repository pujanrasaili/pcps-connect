import test from "node:test";
import assert from "node:assert/strict";
import { notificationIcon } from "../src/utils/notificationIcon.js";

test("each kind of bell message gets a fitting icon and unknown ones the bell", () => {
  assert.equal(notificationIcon("club_poll").name, "FaPoll");
  assert.equal(notificationIcon("club_poll_closing").name, "FaPoll");
  assert.equal(notificationIcon("event_cancelled").name, "FaCalendarAlt");
  assert.equal(notificationIcon("saved_reminder").name, "FaCalendarAlt");
  assert.equal(notificationIcon("club_join_request").name, "FaUsers");
  assert.equal(notificationIcon("board_report").name, "FaFlag");
  assert.equal(notificationIcon("something_new").name, "FaBell");
  assert.equal(notificationIcon().name, "FaBell");
});
