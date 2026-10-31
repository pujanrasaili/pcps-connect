const { pickAdminUserFields, adminUserFieldsProblem } = require("../adminUserFields");

describe("pickAdminUserFields", () => {
  it("keeps role, approval status and profile fields", () => {
    expect(pickAdminUserFields({ role: "admin", approvalStatus: "approved", name: "A", studentId: "1", program: "BIT", semester: "3", phone: "9" })).toEqual({
      role: "admin", approvalStatus: "approved", name: "A", studentId: "1", program: "BIT", semester: "3", phone: "9",
    });
  });

  it("drops everything else", () => {
    expect(pickAdminUserFields({ role: "user", email: "x", emailVerified: true, password: "p", verifyToken: "t", avatar: "a" })).toEqual({ role: "user" });
  });

  it("copes with a missing body", () => {
    expect(pickAdminUserFields()).toEqual({});
  });
});

describe("adminUserFieldsProblem", () => {
  it("accepts plain text values", () => {
    expect(adminUserFieldsProblem({ name: "Sita", role: "user", approvalStatus: "approved" })).toBeNull();
    expect(adminUserFieldsProblem({})).toBeNull();
  });

  it("rejects objects, lists and numbers with the field named", () => {
    expect(adminUserFieldsProblem({ name: { $gt: "" } })).toBe("name must be text");
    expect(adminUserFieldsProblem({ program: ["BIT"] })).toBe("program must be text");
    expect(adminUserFieldsProblem({ semester: 3 })).toBe("semester must be text");
  });

  it("rejects a role or approval status that is not one of the allowed words", () => {
    expect(adminUserFieldsProblem({ role: "superuser" })).toBe("role must be one of: user, admin");
    expect(adminUserFieldsProblem({ approvalStatus: "__proto__" })).toBe("approvalStatus must be one of: pending, approved, rejected");
    expect(adminUserFieldsProblem({ role: "admin", approvalStatus: "rejected" })).toBeNull();
  });
});
