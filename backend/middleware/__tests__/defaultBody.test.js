const express = require("express");
const defaultBody = require("../defaultBody");

function makeApp(withShim) {
  const app = express();
  app.use(express.json());
  if (withShim) app.use(defaultBody);
  app.post("/x", (req, res) => {
    const { name } = req.body; // throws if req.body is undefined
    res.json({ name: name || null });
  });
  app.use((err, req, res, next) => res.status(500).json({ message: "crashed" }));
  return app;
}

async function post(app, init) {
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/x`, { method: "POST", ...init });
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

describe("defaultBody", () => {
  it("lets a handler read req.body on a request that sent no body", async () => {
    expect(await post(makeApp(true))).toEqual({ status: 200, body: { name: null } });
  });

  it("keeps a real JSON body untouched", async () => {
    const res = await post(makeApp(true), { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Asha" }) });
    expect(res).toEqual({ status: 200, body: { name: "Asha" } });
  });

  it("is needed on this version of Express (without it a body-less POST crashes)", async () => {
    const major = Number(require("express/package.json").version.split(".")[0]);
    const res = await post(makeApp(false));
    expect(res.status).toBe(major >= 5 ? 500 : 200);
  });
});
