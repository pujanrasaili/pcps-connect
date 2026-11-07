import { defineConfig } from "@playwright/test";

// Browser smoke tests: every public page and the Dashboard, in English and
// Nepali, on a phone-sized screen, against a mocked API (see e2e/smoke.spec.js).
//   npm run e2e
// In CI the browser is installed with `npx playwright install --with-deps chromium`.
// Elsewhere, set PW_CHROMIUM to the path of an existing Chromium to use that.
const PORT = 4173;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 390, height: 844 },
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: { VITE_API_URL: `http://127.0.0.1:${PORT}/api` },
  },
});
