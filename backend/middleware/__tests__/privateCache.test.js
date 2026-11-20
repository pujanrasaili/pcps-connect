const { privateCache } = require("../privateCache");

function run(cookies) {
  const headers = {};
  const res = { set: (k, v) => (headers[k] = v) };
  const next = jest.fn();
  privateCache({ cookies }, res, next);
  return { headers, next };
}

test("a signed-in request is told not to be cached", () => {
  const { headers, next } = run({ token: "abc" });
  expect(headers["Cache-Control"]).toBe("no-store");
  expect(next).toHaveBeenCalledTimes(1);
});

test("a visitor with no login cookie is left alone", () => {
  const { headers, next } = run({});
  expect(headers["Cache-Control"]).toBeUndefined();
  expect(next).toHaveBeenCalledTimes(1);
});

test("a request where cookies were never parsed still goes on", () => {
  const { headers, next } = run(undefined);
  expect(headers["Cache-Control"]).toBeUndefined();
  expect(next).toHaveBeenCalledTimes(1);
});
