// The site-wide banner an admin can set. A visitor who closes it shouldn't see
// the same one again this session, but a new or edited notice should show.
export const NOTICE_MAX_LENGTH = 200;

export function noticeId(notice) {
  if (!notice) return "";
  return [notice.tone, notice.message, notice.updatedAt].join("|");
}
