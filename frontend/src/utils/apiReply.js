// Spots replies that aren't the JSON the API always sends: a hosting error or
// misconfigured API address often answers 200 with an HTML page (or nothing).
// Pages expect objects like { events: [...] }, so such a reply used to crash
// them; instead it is treated as a failed request.
export const BAD_REPLY_CODE = "ERR_BAD_RESPONSE_FORMAT";

export function isUnexpectedReply(response) {
  if (!response || response.status === 204) return false;
  const data = response.data;
  if (data === null || data === undefined) return true;
  if (typeof data !== "string") return false;
  const type = String(response.headers?.["content-type"] || "");
  return /text\/html/i.test(type) || /^\s*</.test(data);
}
