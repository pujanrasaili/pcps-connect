const { planAdminPromotion } = require("../adminPromotion");

describe("planAdminPromotion", () => {
  it("says so when there is no such account", () => {
    const plan = planAdminPromotion(null);
    expect(plan.action).toBe("none");
    expect(plan.message).toMatch(/Register it on the site first/);
  });

  it("promotes a normal student and makes sure they can log in", () => {
    const plan = planAdminPromotion({ email: "a@x.np", role: "user", emailVerified: false, approvalStatus: "pending" });
    expect(plan).toMatchObject({ action: "promote", update: { role: "admin", emailVerified: true, approvalStatus: "approved" } });
  });

  it("changes nothing for an admin who can already log in", () => {
    const plan = planAdminPromotion({ email: "a@x.np", role: "admin", emailVerified: true, approvalStatus: "approved" });
    expect(plan.action).toBe("none");
  });

  it("repairs an admin who cannot log in yet", () => {
    const plan = planAdminPromotion({ email: "a@x.np", role: "admin", emailVerified: true, approvalStatus: "pending" });
    expect(plan.action).toBe("promote");
  });
});
