// What search engines read for a club that is open on the Clubs page
// (/clubs?club=<id>): the snippet under its title and schema.org data.
const MAX = 160;
const SITE_ID = "https://pcps-connect.vercel.app/#organization";

const oneLine = (text) => String(text || "").replace(/\s+/g, " ").trim();

export function clubMetaDescription(club) {
  if (!club?.name) return null;
  const text = oneLine(club.longDescription || club.description) || `${club.name} — a student club at Patan College of Professional Studies.`;
  if (text.length <= MAX) return text;
  const cut = text.slice(0, MAX - 1);
  return cut.slice(0, cut.lastIndexOf(" ") > 60 ? cut.lastIndexOf(" ") : cut.length).replace(/[\s.,;:]+$/, "") + "…";
}

export function clubJsonLd(club, origin) {
  if (!club?.name || !club?._id) return null;
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: String(club.name),
    url: `${origin}/clubs?club=${club._id}`,
    parentOrganization: { "@id": SITE_ID },
  };
  const description = oneLine(club.longDescription || club.description);
  if (description) data.description = description.slice(0, 500);
  if (/^https?:\/\//i.test(club.image || "")) data.logo = club.image;
  return data;
}
