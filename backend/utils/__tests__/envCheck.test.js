const { checkEnv, PLACEHOLDER_SECRET } = require("../envCheck");

const good = { JWT_SECRET: "x".repeat(40), MONGO_URI: "mongodb://h/db", CLIENT_ORIGIN: "https://app.example.com", NODE_ENV: "production" };

describe("checkEnv", () => {
  it("is quiet for a healthy production setup", () => {
    expect(checkEnv(good)).toEqual({ fatal: [], warnings: [] });
  });

  it("refuses to start without a JWT secret", () => {
    const { fatal } = checkEnv({ ...good, JWT_SECRET: undefined });
    expect(fatal).toHaveLength(1);
    expect(fatal[0]).toMatch(/JWT_SECRET/);
  });

  it("only warns (never blocks) for the example or a short secret", () => {
    const example = checkEnv({ ...good, JWT_SECRET: PLACEHOLDER_SECRET });
    expect(example.fatal).toEqual([]);
    expect(example.warnings[0]).toMatch(/example value/);
    const short = checkEnv({ ...good, JWT_SECRET: "short" });
    expect(short.fatal).toEqual([]);
    expect(short.warnings[0]).toMatch(/shorter than 32/);
  });

  it("warns about a missing database URL", () => {
    expect(checkEnv({ ...good, MONGO_URI: "" }).warnings.join()).toMatch(/MONGO_URI/);
  });

  it("checks CLIENT_ORIGIN only in production", () => {
    expect(checkEnv({ ...good, CLIENT_ORIGIN: undefined }).warnings.join()).toMatch(/CLIENT_ORIGIN/);
    expect(checkEnv({ ...good, CLIENT_ORIGIN: "http://localhost:5173" }).warnings.join()).toMatch(/localhost/);
    expect(checkEnv({ ...good, CLIENT_ORIGIN: undefined, NODE_ENV: "development" }).warnings).toEqual([]);
  });
});
