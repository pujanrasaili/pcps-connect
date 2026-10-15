jest.mock("../../models/Registration");

const Registration = require("../../models/Registration");
const { parseCapacity, capacityConflict } = require("../eventCapacity");

describe("parseCapacity", () => {
  it.each([[10, 10], ["25", 25], [1, 1]])("accepts %p", (input, expected) => {
    expect(parseCapacity(input)).toBe(expected);
  });
  it.each([[0], [-3], [2.5], ["abc"], [NaN], [""], [undefined]])("rejects %p", (input) => {
    // "" and null coerce to 0, which is rejected too
    expect(parseCapacity(input)).toBeNull();
  });
});

describe("capacityConflict", () => {
  afterEach(() => jest.clearAllMocks());

  it("flags a capacity below the current registration count", async () => {
    Registration.countDocuments.mockResolvedValue(40);
    const msg = await capacityConflict("ev1", 10);
    expect(msg).toMatch(/40/);
  });

  it("allows a capacity equal to the registration count", async () => {
    Registration.countDocuments.mockResolvedValue(40);
    expect(await capacityConflict("ev1", 40)).toBeNull();
  });

  it("allows raising capacity", async () => {
    Registration.countDocuments.mockResolvedValue(40);
    expect(await capacityConflict("ev1", 100)).toBeNull();
  });
});
