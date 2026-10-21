const { withMemberCounts } = require("../memberCounts");

describe("withMemberCounts", () => {
  it("attaches counts, using 0 for clubs nobody joined", () => {
    const clubs = [{ _id: "c1", name: "Coding" }, { _id: "c2", name: "Music" }];
    expect(withMemberCounts(clubs, [{ _id: "c1", members: 12 }])).toEqual([
      { _id: "c1", name: "Coding", memberCount: 12 },
      { _id: "c2", name: "Music", memberCount: 0 },
    ]);
  });

  it("converts mongoose documents and matches ids given as objects", () => {
    const id = { toString: () => "c1" };
    const doc = { toObject: () => ({ _id: id, name: "Coding" }) };
    const [out] = withMemberCounts([doc], [{ _id: { toString: () => "c1" }, members: 3 }]);
    expect(out).toMatchObject({ name: "Coding", memberCount: 3 });
  });

  it("copes with no clubs", () => {
    expect(withMemberCounts([], [])).toEqual([]);
  });
});
