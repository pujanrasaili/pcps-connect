import test from "node:test";
import assert from "node:assert/strict";
import { clubsCsv, CLUBS_CSV_HEADER } from "../src/utils/clubsCsv.js";

test("one row per club, formulas defused, blanks for missing details", () => {
  const rows = clubsCsv([
    { name: "=Club", category: "Tech", memberCount: 12, foundedYear: "2019", email: "c@patancollege.edu.np", meetings: "Thu 3 PM", requiresApproval: true },
    { name: "Bare" },
  ]).split("\r\n");
  assert.equal(rows[0].split(",").length, CLUBS_CSV_HEADER.length);
  assert.equal(rows[1], `"'=Club","Tech","12","2019","c@patancollege.edu.np","Thu 3 PM","Yes"`);
  assert.equal(rows[2], `"Bare","","0","","","","No"`);
});
