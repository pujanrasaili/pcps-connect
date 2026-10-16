jest.mock("../../models/AuditLog");

const AuditLog = require("../../models/AuditLog");
const { recordAudit } = require("../audit");

describe("recordAudit", () => {
  afterEach(() => jest.resetAllMocks());

  it("stores who did what, copying the admin's name", async () => {
    AuditLog.create.mockResolvedValue({});
    await recordAudit({ _id: "a1", name: "Root" }, "user.deleted", "Deleted account X");
    expect(AuditLog.create).toHaveBeenCalledWith({
      actor: "a1",
      actorName: "Root",
      action: "user.deleted",
      summary: "Deleted account X",
    });
  });

  it("truncates very long summaries", async () => {
    AuditLog.create.mockResolvedValue({});
    await recordAudit({ _id: "a1", name: "Root" }, "x", "y".repeat(1000));
    expect(AuditLog.create.mock.calls[0][0].summary).toHaveLength(300);
  });

  it("never throws if the write fails", async () => {
    AuditLog.create.mockRejectedValue(new Error("db down"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(recordAudit({ _id: "a1", name: "Root" }, "x", "y")).resolves.toBeUndefined();
  });

  it("tolerates a missing actor", async () => {
    AuditLog.create.mockResolvedValue({});
    await recordAudit(undefined, "x", "y");
    expect(AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ actor: null, actorName: "Unknown" }));
  });
});
