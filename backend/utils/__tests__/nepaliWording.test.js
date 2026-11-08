const fs = require("fs");
const path = require("path");

// The site's Nepali uses one word for an admin (एडमिन, as in the navbar and the
// buttons), so the emails must not switch to प्रशासक.
describe("Nepali wording in emails", () => {
  const catalogs = ["emailText.js", "eventEmailText.js", "clubEmailText.js", "reminderEmailText.js", "noticeEmailText.js"];

  it.each(catalogs)("%s says एडमिन, never प्रशासक", (file) => {
    const text = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    expect(text).not.toMatch(/प्रशासक/);
  });

  it.each(catalogs)("%s spells login as लगइन", (file) => {
    expect(fs.readFileSync(path.join(__dirname, "..", file), "utf8")).not.toMatch(/लग इन/);
  });

  it("does not use the transliteration इभेन्ट for an event", () => {
    for (const file of catalogs) {
      expect(fs.readFileSync(path.join(__dirname, "..", file), "utf8")).not.toMatch(/इभेन्ट/);
    }
  });
});
