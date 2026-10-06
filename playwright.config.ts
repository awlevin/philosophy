import { defineConfig } from "@playwright/test";

const port = 5199;
/** Set to test a deployed site instead of a local dev server, e.g. the production URL. */
const remote = process.env.BASE_URL;

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  fullyParallel: true,
  use: {
    baseURL: remote ?? `http://127.0.0.1:${port}`,
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "phone",
      use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    },
    {
      name: "desktop-dark",
      use: { viewport: { width: 1440, height: 900 }, colorScheme: "dark" },
    },
  ],
  webServer: remote
    ? undefined
    : {
        command: `npx vite --port ${port} --strictPort --host 127.0.0.1`,
        url: `http://127.0.0.1:${port}`,
        reuseExistingServer: true,
      },
});
