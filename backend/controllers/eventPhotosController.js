const Event = require("../models/Event");
const { uploadBufferToCloudinary } = require("../middleware/upload");
const { canManageEvent } = require("../utils/clubAccess");
const { recordAudit } = require("../utils/audit");
const { safeError } = require("../utils/errorMessage");
const cloudinary = require("../config/cloudinary");
const { eventPhotoPublicId } = require("../utils/cloudinaryId");

const MAX_PHOTOS = 8;

// POST /api/events/:id/photos  (multipart, field "image")
// An admin, or a leader of the event's club, adds one photo to the event's
// gallery. Capped so a page can't grow without bound.
async function addEventPhoto(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!(await canManageEvent(req.user, event))) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }
    if (!req.file) return res.status(400).json({ message: "Choose a photo to upload" });
    if ((event.photos || []).length >= MAX_PHOTOS) {
      return res.status(400).json({ message: `An event can have at most ${MAX_PHOTOS} photos. Remove one first.` });
    }

    const uploaded = await uploadBufferToCloudinary(req.file.buffer, "pcps-connect/event-photos");
    event.photos = [...(event.photos || []), uploaded.secure_url];
    await event.save();
    await recordAudit(req.user, "event.photoAdded", `Added a photo to "${event.title}"`);
    res.status(201).json({ message: "Photo added", photos: event.photos });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to add the photo") });
  }
}

// DELETE /api/events/:id/photos?url=<photo url>
// Matched by the photo's address rather than its position, so two organisers
// editing at once can't remove the wrong one.
async function removeEventPhoto(req, res) {
  try {
    const url = typeof req.query.url === "string" ? req.query.url : "";
    if (!url) return res.status(400).json({ message: "Say which photo to remove" });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!(await canManageEvent(req.user, event))) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }
    if (!(event.photos || []).includes(url)) return res.status(404).json({ message: "Photo not found" });

    event.photos = event.photos.filter((p) => p !== url);
    await event.save();
    // Best effort: the photo is already off the site, so a Cloudinary hiccup
    // must not turn this into an error (it only leaves an orphan file).
    const publicId = eventPhotoPublicId(url);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
      } catch (err) {
        console.error("Failed to delete a removed event photo from Cloudinary:", err.message);
      }
    }
    await recordAudit(req.user, "event.photoRemoved", `Removed a photo from "${event.title}"`);
    res.status(200).json({ message: "Photo removed", photos: event.photos });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to remove the photo") });
  }
}

module.exports = { addEventPhoto, removeEventPhoto, MAX_PHOTOS };
