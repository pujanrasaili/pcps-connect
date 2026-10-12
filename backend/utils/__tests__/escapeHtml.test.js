const { escapeHtml } = require("../escapeHtml");

describe("escapeHtml", () => {
  it("escapes all five HTML-special characters", () => {
    expect(escapeHtml(`<script>alert("x") & 'y'</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;"
    );
  });

  it("neutralizes a realistic HTML-injection payload aimed at an admin notification email", () => {
    const maliciousName = `<a href="http://evil.example/phish">Review in admin panel</a>`;
    const escaped = escapeHtml(maliciousName);
    expect(escaped).not.toContain("<a ");
    expect(escaped).not.toContain("</a>");
    expect(escaped).toContain("&lt;a href=&quot;http://evil.example/phish&quot;&gt;");
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeHtml("Pujan Rasaili")).toBe("Pujan Rasaili");
  });

  it("handles null/undefined/number input without throwing", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(42)).toBe("42");
  });
});
