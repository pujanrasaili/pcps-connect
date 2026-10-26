const mongoose = require("mongoose");
const { emailProvider } = require("../utils/emailProvider");

// GET /api/health -- for uptime monitors and "is it awake?" checks. Reports
// whether the database connection is up (mongoose readyState 1 = connected)
// and which email method is set up (just its name, e.g. "brevo"), so you can
// confirm after a deploy that mail is configured: no versions, keys or counts.
// Note "gmail-smtp" cannot actually send from Render's free tier.
// Pinging this every few minutes also keeps a free-tier host from sleeping.
function getHealth(req, res) {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? "ok" : "degraded", database: dbUp ? "connected" : "disconnected", email: emailProvider() });
}

module.exports = { getHealth };
