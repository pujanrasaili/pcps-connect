// Checks the live site is healthy. Run it from your own computer:
//   npm run smoke
// or with other addresses:
//   npm run smoke -- https://your-api.example.com https://your-site.example.com
// The first request can take up to a minute if the free-tier server is asleep.
const { runSmokeChecks } = require("../utils/smokeChecks");

const backend = process.argv[2] || "https://pcps-connect-backend.onrender.com";
const frontend = process.argv[3] || "https://pcps-connect.vercel.app";

(async () => {
  console.log(`API:  ${backend}\nSite: ${frontend}\n(waking the server can take a minute)\n`);
  const results = await runSmokeChecks(backend, frontend);
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` -- ${r.detail}` : ""}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed.");
  process.exit(failed ? 1 : 0);
})();
