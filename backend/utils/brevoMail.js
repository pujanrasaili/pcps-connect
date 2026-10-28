// Sends mail over HTTPS through Brevo's transactional API instead of SMTP.
//
// Why: Render's free web services block outbound SMTP (ports 25, 465 and 587),
// so Gmail-over-SMTP times out there and no email ever leaves -- verification
// links, password resets, everything. HTTPS (port 443) is never blocked.
// Setup is in .env.example: a free Brevo account, a verified sender address and
// an API key in BREVO_API_KEY.

const API_URL = "https://api.brevo.com/v3/smtp/email";
const TIMEOUT_MS = 10000; // never let a slow API hold up the request that asked for the email

// '"PCPS Connect" <me@gmail.com>' -> { name, email }; a bare address works too.
function parseAddress(value = "") {
  const match = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(value);
  if (match) return { name: match[1].trim() || undefined, email: match[2].trim() };
  return { email: String(value).trim() };
}

// nodemailer-style mail options -> Brevo's JSON body.
function buildBrevoPayload(mail, { senderEmail } = {}) {
  const from = parseAddress(mail.from);
  const sender = { email: senderEmail || from.email, ...(from.name && { name: from.name }) };
  const recipients = (Array.isArray(mail.to) ? mail.to : [mail.to]).map((to) => parseAddress(to));

  const payload = {
    sender,
    to: recipients,
    subject: mail.subject,
    htmlContent: mail.html,
    ...(mail.text && { textContent: mail.text }),
    ...(mail.replyTo && { replyTo: parseAddress(mail.replyTo) }),
    ...(mail.headers && Object.keys(mail.headers).length && { headers: mail.headers }),
  };

  // Calendar invites: sent as an attached .ics file.
  if (mail.icalEvent?.content) {
    payload.attachment = [{ name: "invite.ics", content: Buffer.from(mail.icalEvent.content, "utf8").toString("base64") }];
  }
  return payload;
}

// Posts one message. Throws an Error whose message says what Brevo answered, so
// the server log shows the real reason (unverified sender, bad key, ...).
async function sendViaBrevo(mail, { apiKey, senderEmail, fetchImpl = fetch, timeoutMs = TIMEOUT_MS } = {}) {
  if (!apiKey) throw new Error("BREVO_API_KEY is not set");
  let res;
  try {
    res = await fetchImpl(API_URL, {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(buildBrevoPayload(mail, { senderEmail })),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") throw new Error(`Brevo did not answer within ${timeoutMs / 1000} seconds`);
    throw err;
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json()).message || "";
    } catch {
      /* body wasn't JSON */
    }
    throw new Error(`Brevo rejected the email (${res.status})${detail ? `: ${detail}` : ""}`);
  }
  return res.json().catch(() => ({}));
}

module.exports = { parseAddress, buildBrevoPayload, sendViaBrevo };
