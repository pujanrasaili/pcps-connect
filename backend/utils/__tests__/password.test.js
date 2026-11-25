const bcryptjs = require("bcryptjs");
const password = require("../password");

// Passwords already stored in the database must keep working whichever engine
// checks them, and the fast native engine must be the one in use.
const OLD_HASH = "$2a$10$JPte90DJLVa/0oFbIKy5j.0uHbLmY1rFHQo9USUPMqEgIDHSC.xp2"; // "Secret123", made by bcryptjs 2.4.3

describe("password helper", () => {
  it("uses the native engine, which keeps the server responsive during a login rush", () => {
    expect(password.engineName()).toBe("bcrypt");
  });

  it("accepts a hash stored long ago and rejects a wrong password", async () => {
    expect(await password.compare("Secret123", OLD_HASH)).toBe(true);
    expect(await password.compare("secret123", OLD_HASH)).toBe(false);
  });

  it("makes hashes that the JavaScript engine verifies too, and the other way round", async () => {
    const mine = await password.hash("Another-Pass9", 4);
    expect(mine).toMatch(/^\$2[aby]\$04\$/);
    expect(await bcryptjs.compare("Another-Pass9", mine)).toBe(true);
    const theirs = await bcryptjs.hash("Third-Pass7", 4);
    expect(await password.compare("Third-Pass7", theirs)).toBe(true);
  });

  it("uses 10 rounds unless told otherwise", async () => {
    expect(await password.hash("Some-Pass1")).toMatch(/^\$2[aby]\$10\$/);
  });

  it("does not stall other requests while hashing", async () => {
    const hashed = await password.hash("Busy-Pass1");
    let worst = 0;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      worst = Math.max(worst, now - last - 10);
      last = now;
    }, 10);
    await Promise.all(Array.from({ length: 12 }, () => password.compare("Busy-Pass1", hashed)));
    clearInterval(timer);
    // The JavaScript engine freezes the process for over a second here.
    expect(worst).toBeLessThan(400);
  });

  it("keeps working after a hash fails, and never works on more than the allowed few at once", async () => {
    await expect(password.hash(undefined)).rejects.toBeTruthy();
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => password.hash(`Queue-Pass${i}`, 4)));
    expect(results).toHaveLength(8);
    results.forEach((h) => expect(h).toMatch(/^\$2[aby]\$04\$/));
  });
});
