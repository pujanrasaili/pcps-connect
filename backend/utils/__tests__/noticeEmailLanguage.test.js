jest.mock("../sendEmail");
jest.mock("../inApp");

const sendEmail = require("../sendEmail");
const { notifyNewLeaders } = require("../notifyNewLeaders");
const { notifyOrganiserOfQuestion, notifyAskerOfAnswer } = require("../notifyQuestion");
const { noticeEmail } = require("../noticeEmailText");

const DEVANAGARI = /[ऀ-ॿ]/;
const event = { _id: "e1", title: "Hack <Night>" };

beforeEach(() => {
  sendEmail.mockReset();
  sendEmail.mockResolvedValue();
});

describe("notice emails follow the recipient's language", () => {
  it("new leaders", async () => {
    await notifyNewLeaders(
      [{ name: "A", email: "ne@x.com", language: "ne" }, { name: "B", email: "en@x.com" }],
      { name: "Chess <Go>" }
    );
    const [ne, en] = sendEmail.mock.calls.map((c) => c[0]);
    expect(ne.subject).toMatch(DEVANAGARI);
    expect(ne.html).toContain("Chess &lt;Go&gt;");
    expect(en.subject).toBe("You're now a leader of Chess <Go>");
  });

  it("question asked and answered, text escaped", async () => {
    await notifyOrganiserOfQuestion({ email: "o@x.com", language: "ne" }, event, "Is <b>food</b> free?", "Sita");
    await notifyAskerOfAnswer({ _id: "u", name: "Sita", email: "s@x.com", language: "ne" }, event, "Q <i>", "A <u>");
    await notifyAskerOfAnswer({ _id: "u", name: "Sita", email: "s@x.com" }, event, "Q", "A");
    const [asked, answered, english] = sendEmail.mock.calls.map((c) => c[0]);
    expect(asked.subject).toMatch(DEVANAGARI);
    expect(asked.html).toContain("Is &lt;b&gt;food&lt;/b&gt; free?");
    expect(asked.html).toContain("/events/e1");
    expect(answered.html).toContain("Q &lt;i&gt;");
    expect(answered.html).toContain("A &lt;u&gt;");
    expect(english.subject).toBe("Your question about Hack <Night> was answered");
  });

  it("every English notice has a Nepali one", () => {
    const v = { name: "N", club: "C", rawClub: "C", title: "T", rawTitle: "T", asker: "S", question: "Q", answer: "A" };
    for (const kind of ["approved", "rejected", "leader", "asked", "answered"]) {
      const ne = noticeEmail(kind, "ne", v);
      expect(ne.heading).toMatch(DEVANAGARI);
      expect(ne.bodyHtml).toMatch(DEVANAGARI);
      expect(noticeEmail(kind, "en", v).bodyHtml).not.toMatch(DEVANAGARI);
    }
    expect(noticeEmail("approved", "ne", v).ctaText).toMatch(DEVANAGARI);
  });
});
