import { defineConfig } from "@playwright/test";

const port = 5199;

/** Frame-by-frame captures of the page transitions, for the motion lab (`npm run lab`). */
export default defineConfig({
  testDir: ".",
  outputDir: "../lab-out/test-results",
  fullyParallel: true,
  timeout: 300_000,
  use: {
    baseURL: process.env.BASE_URL ?? `http://127.0.0.1:${port}`,
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `npx vite --port ${port} --strictPort --host 127.0.0.1`,
        cwd: "..",
        url: `http://127.0.0.1:${port}`,
        reuseExistingServer: true,
      },
});
