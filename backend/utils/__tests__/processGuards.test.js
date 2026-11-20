const { EventEmitter } = require("events");
const guards = require("../processGuards");

test("a rejected promise nobody awaited is logged, not fatal", () => {
  const proc = new EventEmitter();
  const log = jest.fn();
  guards.installProcessGuards(proc, log);
  proc.emit("unhandledRejection", new Error("brevo timed out"));
  expect(log).toHaveBeenCalledTimes(1);
  expect(log.mock.calls[0][0]).toMatch(/kept running/);
  expect(log.mock.calls[0][1]).toMatch(/brevo timed out/);
});

test("it does not swallow real crashes", () => {
  const proc = new EventEmitter();
  guards.installProcessGuards(proc, jest.fn());
  expect(proc.listenerCount("uncaughtException")).toBe(0);
});

test("any kind of rejection reason can be written down", () => {
  expect(guards.describe("plain text")).toBe("plain text");
  expect(guards.describe({ code: 7 })).toBe('{"code":7}');
  const loop = {};
  loop.self = loop;
  expect(typeof guards.describe(loop)).toBe("string");
  expect(guards.describe(undefined)).toBe("undefined");
});
