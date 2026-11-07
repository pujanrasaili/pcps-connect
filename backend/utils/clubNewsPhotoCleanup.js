const cloudinary = require("../config/cloudinary");
const { clubNewsPhotoPublicId } = require("./cloudinaryId");

// Deletes the photos of club news posts from Cloudinary once the posts are
// gone (one post deleted, or the whole club). Best effort and never throws: the
// posts are already deleted, and an orphan file is only wasted space.
async function destroyClubNewsPhotos(urls) {
  for (const url of (Array.isArray(urls) ? urls : []).filter(Boolean)) {
    const id = clubNewsPhotoPublicId(url);
    if (!id) continue;
    try {
      await cloudinary.uploader.destroy(id, { resource_type: "image" });
    } catch (err) {
      console.error("Failed to delete a club news photo from Cloudinary:", err.message);
    }
  }
}

module.exports = { destroyClubNewsPhotos };
