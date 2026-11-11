const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

describe("Nepali review page", () => {
  it("lists the website text and every email catalog, escaped", () => {
    const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ne-review-")), "review.html");
    execFileSync("node", [path.join(__dirname, "..", "exportNepaliReview.js"), out]);
    const html = fs.readFileSync(out, "utf8");
    for (const title of ["Start here", "New features", "Account emails", "Event emails", "Club emails", "Scheduled emails", "Notice emails", "More website text"]) {
      expect(html).toContain(title);
    }
    expect(html).toContain("Verify my email");
    expect(html).toContain("मेरो इमेल प्रमाणित गर्नुहोस्");
    expect(html).not.toMatch(/&lt;strong&gt;|&lt;\/p&gt;/); // email markup is turned into plain text
    expect((html.match(/<tr data-id=/g) || []).length).toBeGreaterThan(1000);
  });

  it("puts the most-seen screens first, so a short review still covers them", () => {
    const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ne-review-")), "review.html");
    execFileSync("node", [path.join(__dirname, "..", "exportNepaliReview.js"), out]);
    const html = fs.readFileSync(out, "utf8");
    const start = html.indexOf("Start here");
    const accounts = html.indexOf("Account emails <small>");
    const more = html.indexOf("More website text");
    expect(start).toBeGreaterThan(-1);
    expect(start).toBeLessThan(accounts);
    expect(accounts).toBeLessThan(more);
    // The first section holds a few hundred rows, not the whole site.
    const firstSection = html.slice(html.indexOf("<h2>Start here"), html.indexOf("<h2>New features"));
    const rows = (firstSection.match(/<tr data-id=/g) || []).length;
    expect(rows).toBeGreaterThan(80);
    expect(rows).toBeLessThan(500);
    expect(firstSection).toContain("Log in"); // the Login page is among them
    expect(html.slice(more)).not.toContain("Log in to your PCPS Connect account"); // no row appears twice
  });

  it("lists the newest features in their own section, right after the most-seen screens, without repeating rows", () => {
    const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ne-review-")), "review.html");
    execFileSync("node", [path.join(__dirname, "..", "exportNepaliReview.js"), out]);
    const html = fs.readFileSync(out, "utf8");
    const start = html.indexOf("<h2>Start here");
    const news = html.indexOf("<h2>New features");
    const accounts = html.indexOf("Account emails <small>");
    const more = html.indexOf("More website text");
    expect(start).toBeLessThan(news);
    expect(news).toBeLessThan(accounts);
    const section = html.slice(news, accounts);
    for (const text of ["Notice board", "Activity record", "Join online", "Alerts on this device", "How does the notice board work?"]) {
      expect(section).toContain(text);
      expect(html.slice(more)).not.toContain(`<td class="en">${text}<`); // not repeated further down
    }
    expect(html.slice(start, news)).toContain("Print a poster"); // lives on the event page, so it is in "Start here"
    expect((section.match(/<tr data-id=/g) || []).length).toBeGreaterThan(40);
  });

  it("explains that the review can be done in parts", () => {
    const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ne-review-")), "review.html");
    execFileSync("node", [path.join(__dirname, "..", "exportNepaliReview.js"), out]);
    expect(fs.readFileSync(out, "utf8")).toContain("You do not have to do it all");
  });
});
