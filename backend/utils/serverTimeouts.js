// Node closes an idle connection after 5 seconds by default. Render's proxy keeps
// connections to the server open longer than that, so now and then it sends a
// request down a connection Node has just closed and the visitor sees a 502.
// Keeping idle connections a little longer than the proxy does avoids that.
const KEEP_ALIVE_MS = 65000;

function applyServerTimeouts(server) {
  server.keepAliveTimeout = KEEP_ALIVE_MS;
  // Must be larger than keepAliveTimeout or Node can still cut connections early.
  server.headersTimeout = KEEP_ALIVE_MS + 1000;
  return server;
}

module.exports = { applyServerTimeouts, KEEP_ALIVE_MS };
