import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const config = readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");

test("React and the router are built into their own vendor file so deploys keep it cached", () => {
  assert.match(config, /name: 'vendor'/);
  for (const lib of ["react", "react-dom", "react-router", "scheduler"]) assert.ok(config.includes(lib), lib);
});
