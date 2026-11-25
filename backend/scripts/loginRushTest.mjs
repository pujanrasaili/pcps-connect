// Simulates a rush of logins while other people browse, and reports how slow
// browsing gets. Use it against a LOCAL copy of the backend only (it sends
// hundreds of login requests, each pretending to come from a different address).
//
//   BASE=http://localhost:5000 EMAIL=load@test.com PASSWORD='Password123!' \
//   CLIENT_ORIGIN=http://localhost:5173 node scripts/loginRushTest.mjs
//
// The account must already exist, be verified and approved.
const base = process.env.BASE || "http://localhost:5000";
const email = process.env.EMAIL;
const password = process.env.PASSWORD;
const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const seconds = Number(process.env.SECONDS) || 12;
const loginWorkers = Number(process.env.LOGINS) || 30;
const browsers = Number(process.env.BROWSERS) || 20;

if (!email || !password) {
  console.error("Set EMAIL and PASSWORD for an existing, verified account.");
  process.exit(1);
}
if (!/^https?:\/\/(localhost|127\.0\.0\.1)/.test(base)) {
  console.error("This test only runs against a local backend (BASE must be localhost).");
  process.exit(1);
}

const stop = Date.now() + seconds * 1000;
let attempts = 0;
let succeeded = 0;
const latencies = [];

async function loginWorker(worker) {
  let n = 0;
  while (Date.now() < stop) {
    n += 1;
    const res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-requested-with": "XMLHttpRequest",
        origin,
        "x-forwarded-for": `10.${worker}.${(n >> 8) & 255}.${n & 255}`,
      },
      body: JSON.stringify({ email, password }),
    });
    attempts += 1;
    if (res.status === 200) succeeded += 1;
    await res.arrayBuffer();
  }
}

async function browser() {
  while (Date.now() < stop) {
    const started = performance.now();
    const res = await fetch(`${base}/api/clubs`);
    await res.arrayBuffer();
    latencies.push(performance.now() - started);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

await Promise.all([
  ...Array.from({ length: loginWorkers }, (_, i) => loginWorker(i)),
  ...Array.from({ length: browsers }, () => browser()),
]);

latencies.sort((a, b) => a - b);
const at = (p) => Math.round(latencies[Math.floor(latencies.length * p)]);
console.log(`Logins: ${succeeded} of ${attempts} succeeded (${(succeeded / seconds).toFixed(1)} per second)`);
console.log(`Browsing during the rush: ${latencies.length} requests, median ${at(0.5)} ms, 95th percentile ${at(0.95)} ms, slowest ${Math.round(latencies.at(-1))} ms`);
