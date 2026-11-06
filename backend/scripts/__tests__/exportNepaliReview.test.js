const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

describe("Nepali review page", () => {
  it("lists the website text and every email catalog, escaped", () => {
    const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ne-review-")), "review.html");
    execFileSync("node", [path.join(__dirname, "..", "exportNepaliReview.js"), out]);
    const html = fs.readFileSync(out, "utf8");
    for (const title of ["Account emails", "Event emails", "Club emails", "Scheduled emails", "Notice emails", "Website text"]) {
      expect(html).toContain(title);
    }
    expect(html).toContain("Verify my email");
    expect(html).toContain("मेरो इमेल प्रमाणित गर्नुहोस्");
    expect(html).not.toMatch(/&lt;strong&gt;|&lt;\/p&gt;/); // email markup is turned into plain text
    expect((html.match(/<tr data-id=/g) || []).length).toBeGreaterThan(1000);
  });
});
