const { hideOrganiserEmail } = require("../organiserPrivacy");

const event = { _id: "e1", title: "T", createdBy: { _id: "o1", name: "Org", email: "org@patancollege.edu.np" } };

describe("hideOrganiserEmail", () => {
  it("removes the email for guests but keeps the name and everything else", () => {
    expect(hideOrganiserEmail(event, undefined)).toEqual({ _id: "e1", title: "T", createdBy: { _id: "o1", name: "Org" } });
  });

  it("does not modify the original object", () => {
    hideOrganiserEmail(event, null);
    expect(event.createdBy.email).toBe("org@patancollege.edu.np");
  });

  it("keeps the email for a logged-in viewer", () => {
    expect(hideOrganiserEmail(event, { _id: "s1" })).toBe(event);
  });

  it("copes with events that have no organiser", () => {
    expect(hideOrganiserEmail({ _id: "e2", createdBy: null }, undefined)).toEqual({ _id: "e2", createdBy: null });
    expect(hideOrganiserEmail({ _id: "e3" }, undefined)).toEqual({ _id: "e3" });
  });
});
