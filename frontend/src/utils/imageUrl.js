// Cloudinary can resize and re-encode on the fly: `f_auto` picks WebP/AVIF for
// browsers that support it and `q_auto` picks a sensible quality, `w_N,c_limit`
// scales the image down to at most N pixels wide (never up). Uploaded event
// photos are often 3-5 MB phone pictures, so asking for the size actually
// shown makes cards and lists load far faster on mobile data.
//
// Only touches Cloudinary delivery URLs of the form
//   https://res.cloudinary.com/<cloud>/image/upload/<rest>
// that don't already carry a transformation; everything else (local uploads,
// other hosts, seed images) is returned unchanged.
const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

export function optimizeImageUrl(url, width) {
  if (!url || !width) return url;
  const match = CLOUDINARY_UPLOAD.exec(url);
  if (!match) return url;
  const [, base, rest] = match;
  // An existing transformation segment (e.g. "w_300,c_fill/") means someone
  // chose it on purpose; versions look like "v1712345678/" and are fine to prefix.
  const firstSegment = rest.split("/")[0];
  if (!/^v\d+$/.test(firstSegment) && rest.includes("/")) return url;
  return `${base}f_auto,q_auto,w_${Math.round(width)},c_limit/${rest}`;
}
