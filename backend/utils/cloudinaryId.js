// Works out a Cloudinary public id from an uploaded image's address, so the
// file can be deleted from Cloudinary when it is removed from the site.
//   https://res.cloudinary.com/<cloud>/image/upload/v123/pcps-connect/event-photos/abc.jpg
//   -> "pcps-connect/event-photos/abc"
// Only addresses inside the folder we upload event photos to are accepted, so
// a crafted address can never make the server delete some other file.
const EVENT_PHOTO_FOLDER = "pcps-connect/event-photos/";

const CLUB_NEWS_FOLDER = "pcps-connect/club-news/";

function eventPhotoPublicId(url) {
  return publicIdIn(url, EVENT_PHOTO_FOLDER);
}

// Same check for the photos attached to club news posts.
function clubNewsPhotoPublicId(url) {
  return publicIdIn(url, CLUB_NEWS_FOLDER);
}

function publicIdIn(url, folder) {
  if (typeof url !== "string") return null;
  const match = url.match(/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:v\d+\/)?(.+)\.[A-Za-z0-9]+$/);
  if (!match) return null;
  const id = match[1];
  if (!id.startsWith(folder) || id.includes("..") || id.length === folder.length) return null;
  return id;
}

module.exports = { eventPhotoPublicId, clubNewsPhotoPublicId, EVENT_PHOTO_FOLDER, CLUB_NEWS_FOLDER };
