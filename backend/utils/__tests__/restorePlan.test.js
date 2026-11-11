const fs = require("fs");
const os = require("os");
const path = require("path");
const mongoose = require("mongoose");
const { writeBackup } = require("../backupPlan");
const { restoreBackup } = require("../restorePlan");

const { EJSON, ObjectId } = mongoose.mongo.BSON;

// A tiny stand-in for a model: an in-memory collection.
const fakeModel = (name, docs = [], existing = 0) => {
  const stored = [];
  return {
    collection: { name, countDocuments: async () => existing, insertMany: async (d) => stored.push(...d) },
    schema: { paths: {} },
    find: () => ({ lean: async () => docs }),
    stored,
  };
};

describe("restoreBackup", () => {
  let folder;
  beforeEach(() => { folder = fs.mkdtempSync(path.join(os.tmpdir(), "pcps-restore-test-")); });
  afterEach(() => fs.rmSync(folder, { recursive: true, force: true }));

  it("puts back exactly what a backup saved: ids, dates and password hashes", async () => {
    const id = new ObjectId("b".repeat(24));
    const when = new Date("2026-10-24T01:02:03.000Z");
    await writeBackup([fakeModel("users", [{ _id: id, name: "Sita", password: "$2a$hash", createdAt: when }])], folder, EJSON);
    const target = fakeModel("users");
    const result = await restoreBackup([target], folder, EJSON);
    expect(result).toEqual({ users: { restored: 1 } });
    expect(target.stored[0]._id.toString()).toBe("b".repeat(24));
    expect(target.stored[0].password).toBe("$2a$hash");
    expect(target.stored[0].createdAt.getTime()).toBe(when.getTime());
  });

  it("leaves a collection that already has data alone", async () => {
    await writeBackup([fakeModel("users", [{ _id: new ObjectId(), name: "A" }])], folder, EJSON);
    const target = fakeModel("users", [], 5);
    const result = await restoreBackup([target], folder, EJSON);
    expect(result.users).toEqual({ restored: 0, skipped: "already has data" });
    expect(target.stored).toEqual([]);
  });

  it("skips collections that have no file, and restores empty ones as zero", async () => {
    await writeBackup([fakeModel("clubs", [])], folder, EJSON);
    const clubs = fakeModel("clubs");
    const events = fakeModel("events");
    expect(await restoreBackup([clubs, events], folder, EJSON)).toEqual({ clubs: { restored: 0 } });
  });

  it("refuses a folder that isn't a backup", async () => {
    await expect(restoreBackup([fakeModel("users")], folder, EJSON)).rejects.toThrow(/manifest\.json is missing/);
  });

  it("writes nothing at all when one file is damaged or doesn't match the manifest", async () => {
    await writeBackup([fakeModel("users", [{ _id: new ObjectId(), name: "A" }]), fakeModel("clubs", [{ _id: new ObjectId(), name: "C" }])], folder, EJSON);
    fs.writeFileSync(path.join(folder, "clubs.json"), "[]"); // manifest says 1
    const users = fakeModel("users");
    const clubs = fakeModel("clubs");
    await expect(restoreBackup([users, clubs], folder, EJSON)).rejects.toThrow(/clubs\.json has 0 documents but the manifest says 1/);
    expect(users.stored).toEqual([]);
    fs.writeFileSync(path.join(folder, "clubs.json"), '{"not":"a list"}');
    await expect(restoreBackup([users, clubs], folder, EJSON)).rejects.toThrow(/not a list/);
    expect(users.stored).toEqual([]);
  });
});
