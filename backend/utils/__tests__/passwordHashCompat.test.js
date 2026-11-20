const bcrypt = require("bcryptjs");

// Passwords already stored in the database were hashed by bcryptjs 2.x. This
// fixed hash (made by 2.4.3 for the password below) proves that every upgrade
// of the library still accepts them, so nobody is locked out by an update.
const HASH_FROM_BCRYPTJS_2 = "$2a$10$JPte90DJLVa/0oFbIKy5j.0uHbLmY1rFHQo9USUPMqEgIDHSC.xp2";

describe("password hashes made by older bcryptjs versions", () => {
  it("still verify with the installed version", async () => {
    expect(await bcrypt.compare("Secret123", HASH_FROM_BCRYPTJS_2)).toBe(true);
    expect(await bcrypt.compare("secret123", HASH_FROM_BCRYPTJS_2)).toBe(false);
  });

  it("new hashes use the same standard format and verify", async () => {
    const hash = await bcrypt.hash("Another-Pass9", 4);
    expect(hash).toMatch(/^\$2[aby]\$04\$/);
    expect(await bcrypt.compare("Another-Pass9", hash)).toBe(true);
  });
});
