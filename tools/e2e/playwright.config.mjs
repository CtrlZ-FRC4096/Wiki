import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/* The tests serve the built site. They do not build it. Check for it here, in
 * the configuration itself: Playwright starts the web server before it runs
 * globalSetup, so a check any later just produces a timeout that explains
 * nothing. */
const SITE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "_site");
if (!existsSync(SITE)) {
  throw new Error(
    "\n\n  The site is not built, so there is nothing to test.\n" +
    "  Build it first, from the top of the repository:\n\n" +
    "      bundle exec jekyll build\n\n" +
    "  Then run the tests again.\n"
  );
}

/*
 * The widgets download a Python interpreter from a CDN the first time a test
 * runs one. That takes time and bandwidth, so the tests run one at a time and
 * the timeouts are generous.
 *
 * The server serves the built site. Run `bundle exec jekyll build` first.
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8765",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"]
  },
  webServer: {
    // python3 rather than another npm package. Every FRC laptop has it.
    command: "python3 -m http.server 8765 --bind 127.0.0.1 --directory ../../_site",
    url: "http://127.0.0.1:8765/docs/Code/Tutorials/tutorials/",
    reuseExistingServer: true,
    timeout: 30_000,
    // python's http.server logs every request to stderr, which buries the
    // test results. The url check above already covers a server that fails to
    // start, and the guard at the top of this file covers the usual cause.
    stdout: "ignore",
    stderr: "ignore"
  }
});
