const { parseDeadline, registrationClosed } = require("../registrationDeadline");

const EVENT = new Date("2030-06-10T10:00:00Z");

describe("parseDeadline", () => {
  it("treats blank values as no deadline", () => {
    for (const raw of [undefined, null, "", "null"]) expect(parseDeadline(raw, EVENT)).toEqual({ value: null });
  });

  it("accepts a time before the event", () => {
    const r = parseDeadline("2030-06-09T10:00:00Z", EVENT);
    expect(r.error).toBeUndefined();
    expect(r.value).toEqual(new Date("2030-06-09T10:00:00Z"));
  });

  it("accepts a deadline exactly at the event start", () => {
    expect(parseDeadline(EVENT.toISOString(), EVENT).value).toEqual(EVENT);
  });

  it("rejects a deadline after the event starts", () => {
    expect(parseDeadline("2030-06-11T00:00:00Z", EVENT).error).toMatch(/after the event starts/);
  });

  it("rejects text and objects that are not dates", () => {
    expect(parseDeadline("banana", EVENT).error).toMatch(/valid/);
    expect(parseDeadline({ $gt: "" }, EVENT).error).toMatch(/valid/);
  });
});

describe("registrationClosed", () => {
  const now = new Date("2030-06-01T00:00:00Z");
  it("is open when there is no deadline", () => {
    expect(registrationClosed({}, now)).toBe(false);
    expect(registrationClosed({ registrationDeadline: null }, now)).toBe(false);
    expect(registrationClosed(null, now)).toBe(false);
  });
  it("is open until the deadline and closed after it", () => {
    expect(registrationClosed({ registrationDeadline: "2030-06-02T00:00:00Z" }, now)).toBe(false);
    expect(registrationClosed({ registrationDeadline: "2030-05-31T00:00:00Z" }, now)).toBe(true);
  });
});
