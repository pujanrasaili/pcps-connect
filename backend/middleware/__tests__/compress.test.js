const http = require("http");
const express = require("express");
const { compress } = require("../compress");

function startApp() {
  const app = express();
  app.use(compress);
  app.get("/big", (req, res) => res.json({ rows: Array.from({ length: 200 }, (_, i) => ({ id: i, title: "A club event with a long enough title" })) }));
  app.get("/small", (req, res) => res.json({ ok: true }));
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function get(server, path, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get({ port: server.address().port, path, headers: { "accept-encoding": "gzip", ...headers } }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.headers));
    }).on("error", reject);
  });
}

describe("compress", () => {
  let server;
  beforeEach(async () => {
    server = await startApp();
  });
  afterEach(() => new Promise((resolve) => server.close(resolve)));

  it("gzips a large JSON answer", async () => {
    const headers = await get(server, "/big");
    expect(headers["content-encoding"]).toBe("gzip");
    expect(headers.vary).toMatch(/Accept-Encoding/i);
  });

  it("leaves a tiny answer alone", async () => {
    expect((await get(server, "/small"))["content-encoding"]).toBeUndefined();
  });

  it("sends plain text when the client does not accept gzip or opts out", async () => {
    expect((await get(server, "/big", { "accept-encoding": "identity" }))["content-encoding"]).toBeUndefined();
    expect((await get(server, "/big", { "x-no-compression": "1" }))["content-encoding"]).toBeUndefined();
  });
});
