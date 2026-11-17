const Registration = require("../Registration");
const ClubMembership = require("../ClubMembership");
const ClubPost = require("../ClubPost");
const ClubIdea = require("../ClubIdea");
const EventQuestion = require("../EventQuestion");

// Seat counts, attendee lists and club member lists search by event / club on
// their own. A compound index that starts with `user` can't serve those, so
// without these two the database reads the whole collection every time.
const has = (Model, keys) =>
  Model.schema.indexes().some(([fields]) => JSON.stringify(fields) === JSON.stringify(keys));

describe("indexes for the hot lookups", () => {
  it("Registration is indexed by event alone", () => {
    expect(has(Registration, { event: 1 })).toBe(true);
  });
  it("ClubMembership is indexed by club alone", () => {
    expect(has(ClubMembership, { club: 1 })).toBe(true);
  });
  it("the one-per-student unique rules are still there", () => {
    expect(has(Registration, { user: 1, event: 1 })).toBe(true);
    expect(has(ClubMembership, { user: 1, club: 1 })).toBe(true);
  });
  it("club news, the idea box and event questions are indexed for their newest-first lists", () => {
    expect(has(ClubPost, { club: 1, pinned: -1, createdAt: -1 })).toBe(true);
    expect(has(ClubPost, { club: 1, createdAt: -1 })).toBe(true);
    expect(has(ClubIdea, { club: 1, createdAt: -1 })).toBe(true);
    expect(has(EventQuestion, { event: 1, createdAt: -1 })).toBe(true);
  });
});
