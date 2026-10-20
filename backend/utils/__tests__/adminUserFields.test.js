const { pickAdminUserFields } = require("../adminUserFields");

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
