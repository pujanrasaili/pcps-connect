// The address a browser gives us to send it alerts is a URL the SERVER later
// sends a request to. If a student could register any address there, they
// could make the server call things it shouldn't (an internal service, say).
// So only the real browser push services are accepted: Chrome/Edge/Brave
// (Google), Firefox (Mozilla), Safari (Apple) and Windows.
const PUSH_SERVICE_DOMAINS = ["fcm.googleapis.com", "push.services.mozilla.com", "push.apple.com", "notify.windows.com"];
const MAX_ENDPOINT = 1000;

function isPushServiceEndpoint(endpoint) {
  if (typeof endpoint !== "string" || endpoint.length > MAX_ENDPOINT) return false;
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  if (url.port && url.port !== "443") return false;
  const host = url.hostname.toLowerCase();
  return PUSH_SERVICE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

module.exports = { isPushServiceEndpoint, PUSH_SERVICE_DOMAINS, MAX_ENDPOINT };
