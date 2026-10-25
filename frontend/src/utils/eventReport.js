// Numbers and a plain-text summary for an event's organisers, computed from the
// attendee list the Attendees window already loads. Pending join requests don't
// count as registered (they were never confirmed).
export function eventReport(registrations = [], waitlistCount = 0) {
  const confirmed = registrations.filter((r) => r.status !== "pending");
  const attended = confirmed.filter((r) => r.attended).length;
  const registered = confirmed.length;
  const attendanceRate = registered ? Math.round((attended / registered) * 100) : null;

  const ratings = confirmed.map((r) => r.rating).filter((n) => Number.isInteger(n) && n >= 1 && n <= 5);
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: ratings.filter((n) => n === stars).length }));
  const averageRating = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null;
  const comments = confirmed.filter((r) => r.feedback && r.feedback.trim()).length;

  return {
    registered,
    attended,
    noShows: registered - attended,
    attendanceRate,
    waitlist: waitlistCount,
    ratingCount: ratings.length,
    averageRating,
    distribution,
    comments,
  };
}

export function reportText(title, report) {
  const lines = [`${title} -- event summary`];
  lines.push(`Registered: ${report.registered}`);
  lines.push(`Attended: ${report.attended}${report.attendanceRate === null ? "" : ` (${report.attendanceRate}%)`}`);
  lines.push(`Did not attend: ${report.noShows}`);
  if (report.waitlist) lines.push(`Left on the waitlist: ${report.waitlist}`);
  lines.push(
    report.averageRating === null
      ? "Ratings: none yet"
      : `Rating: ${report.averageRating}/5 from ${report.ratingCount} rating${report.ratingCount === 1 ? "" : "s"}`
  );
  if (report.comments) lines.push(`Written comments: ${report.comments}`);
  return lines.join("\n");
}
