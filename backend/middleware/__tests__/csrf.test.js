const { requireCsrfHeader } = require("../csrf");

function run(method, headers = {}) {
  const req = { method, headers };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  const next = jest.fn();
  requireCsrfHeader(req, res, next);
  return { res, next };
}

describe("requireCsrfHeader", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])("blocks a %s without the custom header", (method) => {
    const { res, next } = run(method);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("blocks a mutating request with the wrong header value", () => {
    const { res, next } = run("POST", { "x-requested-with": "fetch" });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])("allows a %s with the header", (method) => {
    const { next } = run(method, { "x-requested-with": "XMLHttpRequest" });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each(["GET", "HEAD", "OPTIONS"])("never requires the header for %s", (method) => {
    const { next } = run(method);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
