const cloudinary = require("../config/cloudinary");
const { eventPhotoPublicId } = require("./cloudinaryId");

// Deletes an event's gallery files from Cloudinary after the event itself is
// gone, so they don't sit in storage with nothing pointing at them. Best
// effort and never throws: the event is already deleted, and an orphan file
// is only wasted space.
async function destroyEventPhotos(photos) {
  if (!Array.isArray(photos) || photos.length === 0) return;
  for (const url of photos) {
    const id = eventPhotoPublicId(url);
    if (!id) continue;
    try {
      await cloudinary.uploader.destroy(id, { resource_type: "image" });
    } catch (err) {
      console.error("Failed to delete an event photo from Cloudinary:", err.message);
    }
  }
}

module.exports = { destroyEventPhotos };
