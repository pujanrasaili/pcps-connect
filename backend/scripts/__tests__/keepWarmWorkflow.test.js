const fs = require("fs");
const path = require("path");

const text = fs.readFileSync(path.join(__dirname, "../../../.github/workflows/keep-warm.yml"), "utf8");

describe("keep-warm workflow", () => {
  it("is off until a KEEP_WARM_URL variable is set", () => {
    expect(text).toMatch(/if: \$\{\{ vars\.KEEP_WARM_URL != '' \}\}/);
    expect(text).toMatch(/URL: \$\{\{ vars\.KEEP_WARM_URL \}\}/);
  });

  it("visits every 10 minutes only during the day in Nepal (UTC 00:00-17:50)", () => {
    expect(text).toMatch(/cron: "\*\/10 0-17 \* \* \*"/);
  });

  it("reports a failed visit as a warning, never as a failed run", () => {
    expect(text).toContain("::warning::");
    expect(text).not.toMatch(/\n\s+exit 1/);
  });

  it("has a manual trigger and does not touch repository contents or secrets", () => {
    expect(text).toContain("workflow_dispatch:");
    expect(text).not.toContain("secrets.");
    expect(text).not.toContain("actions/checkout");
  });
});
