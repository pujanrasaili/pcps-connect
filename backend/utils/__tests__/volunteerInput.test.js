const { cleanRoles, MAX_ROLES } = require("../volunteerInput");

describe("cleanRoles", () => {
  it("accepts an empty list (volunteering off)", () => {
    expect(cleanRoles({ roles: [] })).toEqual({ value: [] });
  });
  it("trims and tidies names, keeps ids and whole-number places", () => {
    expect(cleanRoles({ roles: [{ _id: "abc", name: "  Registration   desk ", slots: "3" }, { name: "Setup", slots: 5 }] })).toEqual({
      value: [{ _id: "abc", name: "Registration desk", slots: 3 }, { name: "Setup", slots: 5 }],
    });
  });
  it.each([
    [undefined, "Roles must be a list"],
    [{}, "Roles must be a list"],
    [[null], "Each role needs a name and a number of places"],
    [[{ name: "  ", slots: 2 }], "Each role needs a name"],
    [[{ name: "x".repeat(41), slots: 2 }], "A role name must be 40 characters or fewer"],
    [[{ name: "A", slots: 0 }], "Places for a role must be a whole number from 1 to 50"],
    [[{ name: "A", slots: 51 }], "Places for a role must be a whole number from 1 to 50"],
    [[{ name: "A", slots: 1.5 }], "Places for a role must be a whole number from 1 to 50"],
    [[{ name: "A", slots: 1 }, { name: "a", slots: 2 }], "Two roles can't have the same name"],
  ])("rejects %j", (roles, message) => {
    expect(cleanRoles({ roles })).toEqual({ error: message });
  });
  it(`allows at most ${MAX_ROLES} roles`, () => {
    const six = Array.from({ length: 6 }, (_, i) => ({ name: `R${i}`, slots: 1 }));
    expect(cleanRoles({ roles: six }).error).toMatch(/at most 5/);
    expect(cleanRoles({ roles: six.slice(0, 5) }).value).toHaveLength(5);
  });
});
