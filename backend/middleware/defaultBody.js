// Express 5 leaves req.body undefined when a request has no body (Express 4 made
// it {}). Many handlers read req.body.something, so a bare POST/DELETE with no
// body would crash with a 500 instead of the usual friendly 400. Putting {} back
// keeps every handler behaving as before.
function defaultBody(req, res, next) {
  if (req.body === undefined) req.body = {};
  next();
}

module.exports = defaultBody;
