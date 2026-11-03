// Works out a Cloudinary public id from an uploaded image's address, so the
// file can be deleted from Cloudinary when it is removed from the site.
//   https://res.cloudinary.com/<cloud>/image/upload/v123/pcps-connect/event-photos/abc.jpg
//   -> "pcps-connect/event-photos/abc"
// Only addresses inside the folder we upload event photos to are accepted, so
// a crafted address can never make the server delete some other file.
const EVENT_PHOTO_FOLDER = "pcps-connect/event-photos/";

function eventPhotoPublicId(url) {
  if (typeof url !== "string") return null;
  const match = url.match(/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:v\d+\/)?(.+)\.[A-Za-z0-9]+$/);
  if (!match) return null;
  const id = match[1];
  if (!id.startsWith(EVENT_PHOTO_FOLDER) || id.includes("..") || id.length === EVENT_PHOTO_FOLDER.length) return null;
  return id;
}

module.exports = { eventPhotoPublicId, EVENT_PHOTO_FOLDER };
