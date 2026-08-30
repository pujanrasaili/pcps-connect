const multer = require("multer");
const path = require("path");
const cloudinary = require("../config/cloudinary");

// Files are kept in memory (never written to local disk) since most
// hosting platforms wipe local files on every redeploy or restart. Each
// file is then streamed straight to Cloudinary -- see uploadBufferToCloudinary().
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const isAllowed = allowed.test(path.extname(file.originalname).toLowerCase());
  if (isAllowed) return cb(null, true);
  cb(new Error("Only image files (jpg, png, webp, gif) are allowed"));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Wraps Cloudinary's stream-based uploader in a Promise so controllers can
// just `await` it. folder groups uploads by type in the Cloudinary
// dashboard (e.g. "pcps-connect/events", "pcps-connect/clubs").
function uploadBufferToCloudinary(buffer, folder = "pcps-connect") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

module.exports = upload;
module.exports.uploadBufferToCloudinary = uploadBufferToCloudinary;
