// Turns the running totals from the events aggregation into what the API
// returns: the average to one decimal place, or null when nobody has rated
// yet (so the UI can show nothing rather than a misleading "0.0").
function ratingSummary(ratingSum, ratingCount) {
  if (!ratingCount) return { averageRating: null, ratingCount: 0 };
  return { averageRating: Math.round((ratingSum / ratingCount) * 10) / 10, ratingCount };
}

module.exports = { ratingSummary };
