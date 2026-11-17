const compression = require("compression");

// Gzip/deflate for API answers (the event and club lists are large JSON and
// shrink to a fraction on a phone connection). Tiny answers are left alone, and
// a request can opt out with the "x-no-compression" header.
const compress = compression({
  threshold: 1024,
  filter: (req, res) => (req.headers["x-no-compression"] ? false : compression.filter(req, res)),
});

module.exports = { compress };
