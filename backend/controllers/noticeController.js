const SiteNotice = require("../models/SiteNotice");
const { cleanNotice } = require("../utils/siteNotice");
const { recordAudit } = require("../utils/audit");
const { safeError } = require("../utils/errorMessage");

// GET /api/notice  (public) -- the banner everyone sees, or null.
async function getNotice(req, res) {
  try {
    const notice = await SiteNotice.findOne().sort({ updatedAt: -1 });
    res.json({ notice: notice ? { message: notice.message, tone: notice.tone, updatedAt: notice.updatedAt } : null });
  } catch (err) {
    // The banner is a nicety: never let it break page loads.
    console.error(err);
    res.json({ notice: null });
  }
}

// PUT /api/admin/notice  (admin only) -- set the banner, or clear it with a blank message.
async function setNotice(req, res) {
  try {
    const cleaned = cleanNotice(req.body);
    if (cleaned.error) return res.status(400).json({ message: cleaned.error });

    if (cleaned.clear) {
      await SiteNotice.deleteMany({});
      await recordAudit(req.user, "notice.cleared", "Cleared the site notice");
      return res.json({ notice: null });
    }

    // Upsert keeps it to a single document even if two admins save at once.
    const notice = await SiteNotice.findOneAndUpdate(
      {},
      { ...cleaned, updatedByName: req.user.name || "" },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await recordAudit(req.user, "notice.set", `Set the site notice: "${cleaned.message}"`);
    res.json({ notice: { message: notice.message, tone: notice.tone, updatedAt: notice.updatedAt } });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to save the notice") });
  }
}

module.exports = { getNotice, setNotice };
