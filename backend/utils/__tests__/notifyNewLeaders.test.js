jest.mock("../sendEmail");
const sendEmail = require("../sendEmail");
const { notifyNewLeaders } = require("../notifyNewLeaders");

describe("notifyNewLeaders", () => {
  afterEach(() => jest.resetAllMocks());

  it("emails each new leader, escaping names", async () => {
    sendEmail.mockResolvedValue();
    const n = await notifyNewLeaders([{ name: "<b>Sita</b>", email: "s@x.com" }, { name: "Ram", email: "r@x.com" }], { name: "Tech" });
    expect(n).toBe(2);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    const call = sendEmail.mock.calls[0][0];
    expect(call.to).toBe("s@x.com");
    expect(call.subject).toContain("Tech");
    expect(call.html).not.toContain("<b>Sita</b>");
  });

  it("skips people without an email and survives a failing send", async () => {
    sendEmail.mockRejectedValue(new Error("smtp down"));
    await expect(notifyNewLeaders([{ name: "A" }, { name: "B", email: "b@x.com" }], { name: "Tech" })).resolves.toBe(1);
  });
});
