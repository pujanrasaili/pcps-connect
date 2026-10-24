const { htmlToText } = require("../htmlToText");

describe("htmlToText", () => {
  it("returns an empty string for nothing", () => {
    expect(htmlToText("")).toBe("");
    expect(htmlToText(undefined)).toBe("");
  });

  it("strips tags and keeps paragraphs on separate lines", () => {
    expect(htmlToText("<h1>Hello Sita</h1><p>Your event is <b>tomorrow</b>.</p>")).toBe("Hello Sita\nYour event is tomorrow.");
  });

  it("keeps link targets as 'label (url)'", () => {
    expect(htmlToText('<a href="https://x.test/verify?t=1">Verify email</a>')).toBe("Verify email (https://x.test/verify?t=1)");
  });

  it("does not repeat a link whose label is the url", () => {
    expect(htmlToText('<a href="https://x.test/a">https://x.test/a</a>')).toBe("https://x.test/a");
  });

  it("turns list items into dashes and <br> into line breaks", () => {
    expect(htmlToText("<ul><li>One</li><li>Two</li></ul>Line<br>Next")).toBe("- One\n- Two\nLine\nNext");
  });

  it("drops style and script blocks and decodes entities", () => {
    expect(htmlToText("<style>p{color:red}</style><p>Tom &amp; Jerry &lt;3 &quot;hi&quot;</p>")).toBe('Tom & Jerry <3 "hi"');
  });

  it("works on a real PCPS email shell", () => {
    const renderEmail = require("../emailTemplate");
    const text = htmlToText(renderEmail({ heading: "Reset your password", bodyHtml: "<p>Click below.</p>", ctaText: "Reset password", ctaUrl: "https://app.test/reset?token=abc" }));
    expect(text).toContain("PCPS Connect");
    expect(text).toContain("Reset your password");
    expect(text).toContain("Reset password (https://app.test/reset?token=abc)");
    expect(text).not.toMatch(/<|style=/);
  });
});
