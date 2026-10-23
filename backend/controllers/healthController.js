const mongoose = require("mongoose");

// GET /api/health -- for uptime monitors and "is it awake?" checks. Reports
// whether the database connection is up (mongoose readyState 1 = connected)
// and nothing else: no versions, config or counts.
// Pinging this every few minutes also keeps a free-tier host from sleeping.
function getHealth(req, res) {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? "ok" : "degraded", database: dbUp ? "connected" : "disconnected" });
}

module.exports = { getHealth };
