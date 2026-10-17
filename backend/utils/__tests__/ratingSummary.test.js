const { ratingSummary } = require("../ratingSummary");

describe("ratingSummary", () => {
  it("returns null average when there are no ratings", () => {
    expect(ratingSummary(0, 0)).toEqual({ averageRating: null, ratingCount: 0 });
    expect(ratingSummary(undefined, undefined)).toEqual({ averageRating: null, ratingCount: 0 });
  });

  it("averages to one decimal place", () => {
    expect(ratingSummary(14, 3)).toEqual({ averageRating: 4.7, ratingCount: 3 });
    expect(ratingSummary(9, 2)).toEqual({ averageRating: 4.5, ratingCount: 2 });
  });

  it("handles a single rating", () => {
    expect(ratingSummary(5, 1)).toEqual({ averageRating: 5, ratingCount: 1 });
  });
});
