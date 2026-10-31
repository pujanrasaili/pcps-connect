// A quick "is the deployed site healthy?" check you can run from your own
// computer (the live site can't be reached from CI). Every check is read-only:
// it only loads public pages and confirms protected ones say "not logged in".
// `fetchFn` is injected so the logic can be tested without a network.
async function runSmokeChecks(backend, frontend, fetchFn = fetch) {
  const api = backend.replace(/\/+$/, "");
  const site = frontend.replace(/\/+$/, "");
  const results = [];

  async function check(name, fn) {
    try {
      const detail = await fn();
      results.push({ name, ok: true, detail: detail || "" });
    } catch (err) {
      results.push({ name, ok: false, detail: err.message });
    }
  }
  const get = (url) => fetchFn(url, { signal: AbortSignal.timeout(90000), redirect: "manual" });
  const expect = (cond, message) => { if (!cond) throw new Error(message); };

  await check("API is awake and the database is connected", async () => {
    const res = await get(`${api}/api/health`);
    const body = await res.json();
    expect(res.status === 200 && body.status === "ok", `health said ${res.status} ${body.status}`);
    expect(body.database === "connected", `database is ${body.database}`);
    return `email: ${body.email}`;
  });

  await check("Email can really be sent (not the Gmail SMTP fallback)", async () => {
    const body = await (await get(`${api}/api/health`)).json();
    expect(body.email === "brevo", `email provider is "${body.email}" -- set BREVO_API_KEY on Render`);
  });

  await check("Events list loads", async () => {
    const res = await get(`${api}/api/events`);
    const body = await res.json();
    expect(res.status === 200 && Array.isArray(body.events), `GET /api/events gave ${res.status}`);
    return `${body.events.length} event(s)`;
  });

  await check("Clubs list loads", async () => {
    const res = await get(`${api}/api/clubs`);
    const body = await res.json();
    expect(res.status === 200 && Array.isArray(body.clubs), `GET /api/clubs gave ${res.status}`);
    return `${body.clubs.length} club(s)`;
  });

  await check("Private pages refuse visitors who are not logged in", async () => {
    for (const path of ["/api/notifications", "/api/registrations/my", "/api/admin/users"]) {
      const res = await get(`${api}${path}`);
      expect(res.status === 401 || res.status === 403, `${path} answered ${res.status} to a visitor`);
    }
  });

  await check("API sends basic security headers", async () => {
    const res = await get(`${api}/api/health`);
    expect(res.headers.get("x-content-type-options") === "nosniff", "missing X-Content-Type-Options");
    expect(!res.headers.get("x-powered-by"), "X-Powered-By is exposed");
  });

  await check("Website loads", async () => {
    const res = await get(site);
    expect(res.status === 200, `website answered ${res.status}`);
    expect((await res.text()).includes('id="root"'), "page has no app root");
  });

  await check("Website sends a Content-Security-Policy", async () => {
    const res = await get(site);
    expect(res.headers.get("content-security-policy"), "no CSP header");
  });

  await check("Opening a page address directly works (e.g. /events)", async () => {
    const res = await get(`${site}/events`);
    expect(res.status === 200, `/events answered ${res.status}`);
  });

  return results;
}

module.exports = { runSmokeChecks };
