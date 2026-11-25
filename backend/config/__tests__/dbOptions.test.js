const { dbOptions, DEFAULT_POOL } = require("../dbOptions");

describe("dbOptions", () => {
  it("uses a small pool and short timeouts by default", () => {
    expect(dbOptions({})).toEqual({
      maxPoolSize: DEFAULT_POOL,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
  });

  it("reads the pool size from MONGO_POOL_SIZE", () => {
    expect(dbOptions({ MONGO_POOL_SIZE: "25" }).maxPoolSize).toBe(25);
  });

  it.each(["0", "-3", "abc", "2.5", "500", ""])("ignores the bad value %p", (bad) => {
    expect(dbOptions({ MONGO_POOL_SIZE: bad }).maxPoolSize).toBe(DEFAULT_POOL);
  });
});
