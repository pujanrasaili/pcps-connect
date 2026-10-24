const path = require("path");
const fs = require("fs");
const os = require("os");
const mongoose = require("mongoose");
const { backupFolderName, defaultBackupRoot, isInsideDirectory, writeBackup } = require("../backupPlan");

describe("backupFolderName", () => {
  it("is dated, zero-padded and sorts chronologically", () => {
    expect(backupFolderName(new Date(2026, 9, 4, 7, 5))).toBe("pcps-backup-2026-10-04-0705");
    expect(backupFolderName(new Date(2026, 11, 31, 23, 59))).toBe("pcps-backup-2026-12-31-2359");
  });
});

describe("defaultBackupRoot", () => {
  it("is a pcps-backups folder in the home directory", () => {
    expect(defaultBackupRoot(path.join(path.sep, "home", "sita"))).toBe(path.join(path.sep, "home", "sita", "pcps-backups"));
  });
});

describe("isInsideDirectory", () => {
  const project = path.resolve("/work/pcps-connect");
  it("detects a folder inside the project (so the script refuses it)", () => {
    expect(isInsideDirectory(path.join(project, "backend", "backups"), project)).toBe(true);
    expect(isInsideDirectory(project, project)).toBe(true);
  });
  it("allows folders elsewhere, including look-alike sibling names", () => {
    expect(isInsideDirectory(path.resolve("/work/pcps-backups"), project)).toBe(false);
    expect(isInsideDirectory(path.resolve("/work/pcps-connect-old/x"), project)).toBe(false);
    expect(isInsideDirectory(path.resolve("/home/sita/pcps-backups"), project)).toBe(false);
  });
});

describe("writeBackup", () => {
  const { EJSON, ObjectId } = mongoose.mongo.BSON;
  const fakeModel = (name, docs) => ({ collection: { name }, find: () => ({ lean: async () => docs }) });

  it("writes one file per collection plus a manifest, keeping ids and dates restorable", async () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "pcps-backup-test-"));
    const id = new ObjectId("a".repeat(24));
    const when = new Date("2026-10-24T01:02:03.000Z");
    const counts = await writeBackup(
      [fakeModel("users", [{ _id: id, name: "Sita", createdAt: when }]), fakeModel("clubs", [])],
      path.join(folder, "run"),
      EJSON,
      when
    );
    expect(counts).toEqual({ users: 1, clubs: 0 });

    const users = EJSON.parse(fs.readFileSync(path.join(folder, "run", "users.json"), "utf8"));
    expect(users[0]._id.toString()).toBe("a".repeat(24));
    expect(users[0].createdAt.getTime()).toBe(when.getTime());
    expect(JSON.parse(fs.readFileSync(path.join(folder, "run", "clubs.json"), "utf8"))).toEqual([]);
    expect(JSON.parse(fs.readFileSync(path.join(folder, "run", "manifest.json"), "utf8"))).toEqual({
      savedAt: "2026-10-24T01:02:03.000Z",
      counts: { users: 1, clubs: 0 },
    });
    fs.rmSync(folder, { recursive: true, force: true });
  });
});
