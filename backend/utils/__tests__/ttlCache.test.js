const { createTtlCache } = require("../ttlCache");

describe("createTtlCache", () => {
  it("returns a stored value until it expires", () => {
    let t = 1000;
    const cache = createTtlCache({ ttlMs: 500, now: () => t });
    cache.set("a", "one");
    expect(cache.get("a")).toBe("one");
    t = 1499;
    expect(cache.get("a")).toBe("one");
    t = 1500;
    expect(cache.get("a")).toBeUndefined();
  });

  it("returns undefined for a key it never saw", () => {
    expect(createTtlCache({ ttlMs: 10 }).get("nope")).toBeUndefined();
  });

  it("keeps at most `max` keys, dropping the oldest", () => {
    const cache = createTtlCache({ ttlMs: 10000, max: 2 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });

  it("can be cleared", () => {
    const cache = createTtlCache({ ttlMs: 10000 });
    cache.set("a", 1);
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
  });
});
