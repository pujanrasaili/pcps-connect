const fs = require("fs");
const { buildApiDoc, readRoutes, readMounts, readBackendFile, DOC_PATH, DESCRIPTIONS } = require("../generateApiDocs");

describe("readRoutes", () => {
  const source = [
    'router.get("/open", listThings);',
    'router.get("/mine", protect, getMine);',
    'router.post("/send", protect, staffOnly, actionLimiter, upload.single("image"), sendIt);',
    'router.get("/maybe/:id", optionalAuth, getMaybe);',
    "router.use(protect);",
    'router.get("/after-protect", afterProtect);',
    'router.put("/staff", staffOnly, staffThing);',
    "router.use(adminOnly);",
    'router.delete("/admin-thing", adminThing);',
  ].join("\n");
  const routes = readRoutes(source);
  const byHandler = Object.fromEntries(routes.map((r) => [r.handler, r]));

  it("reads method, path and handler", () => {
    expect(byHandler.listThings).toMatchObject({ method: "GET", subpath: "/open", access: "Public" });
    expect(byHandler.adminThing).toMatchObject({ method: "DELETE", subpath: "/admin-thing" });
  });

  it("takes the strongest access level from the route's own middleware", () => {
    expect(byHandler.getMine.access).toBe("Logged in");
    expect(byHandler.sendIt.access).toBe("Staff");
    expect(byHandler.sendIt.note).toBe("rate limited; image upload");
    expect(byHandler.getMaybe).toMatchObject({ access: "Public", note: "logged-in users see more" });
  });

  it("applies router.use(...) middleware to the routes after it", () => {
    expect(byHandler.afterProtect.access).toBe("Logged in");
    expect(byHandler.staffThing.access).toBe("Staff");
    expect(byHandler.adminThing.access).toBe("Admin");
  });
});

describe("the real API", () => {
  const mounts = readMounts(readBackendFile("index.js"));
  const all = mounts.flatMap(({ file }) => readRoutes(readBackendFile(file)));

  it("finds every mounted route file", () => {
    expect(mounts.length).toBeGreaterThanOrEqual(12);
    expect(all.length).toBeGreaterThan(50);
  });

  it("has a written description for every endpoint (add new handlers to DESCRIPTIONS)", () => {
    const missing = all.map((r) => r.handler).filter((h) => !DESCRIPTIONS[h]);
    expect(missing).toEqual([]);
  });

  it("has no description left over for a handler that no longer exists", () => {
    const handlers = new Set(all.map((r) => r.handler));
    expect(Object.keys(DESCRIPTIONS).filter((h) => !handlers.has(h))).toEqual([]);
  });

  it("keeps docs/API.md up to date (run `npm run docs:api` in backend/ if this fails)", () => {
    expect(fs.readFileSync(DOC_PATH, "utf8")).toBe(buildApiDoc(readBackendFile));
  });
});
