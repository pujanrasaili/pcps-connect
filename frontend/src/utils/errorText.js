// Turns a failed request into a sentence a student can act on. Kept free of
// axios imports so it can be tested on its own.
//
// The backend always answers errors with { message }, and that wins. Without
// it, raw axios text ("Network Error", "Request failed with status code 502")
// is what people used to see -- confusing, and common here because the free
// Render server sleeps and answers with an empty 502/503/504 while it wakes.
export function errorText(err, fallback = "Something went wrong. Please try again.") {
  const fromServer = err?.response?.data?.message;
  if (typeof fromServer === "string" && fromServer) return fromServer;

  const status = err?.response?.status;
  if (!err?.response && (err?.code === "ERR_NETWORK" || err?.message === "Network Error")) {
    return "Can't reach the server. Check your internet connection and try again.";
  }
  if (err?.code === "ERR_BAD_RESPONSE_FORMAT") return "The server sent an unexpected reply. Please try again in a minute.";
  if (err?.code === "ECONNABORTED") return "The server took too long to answer. Please try again.";
  if (status === 502 || status === 503 || status === 504) {
    return "The server is waking up or busy. Please try again in a minute.";
  }
  if (status === 429) return "Too many attempts. Please wait a few minutes and try again.";
  return fallback;
}
