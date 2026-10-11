// Escapes HTML-special characters so untrusted text can be safely dropped
// into an HTML email (or any other HTML string we build by hand) without
// the content being interpreted as markup -- e.g. a user's own name, which
// has no character restrictions at registration, landing unescaped inside
// an email an admin opens would let someone inject fake buttons/links or
// otherwise reshape the message.
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = { escapeHtml };
