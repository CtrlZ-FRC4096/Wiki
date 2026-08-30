import { test, expect } from "@playwright/test";
import { watchForErrors, expectNoErrors } from "./helpers.mjs";

/* Every tutorial page must load, carry the widgets it claims to, and not
 * scroll sideways on a narrow screen. */
const PAGES = [
  { path: "/docs/Code/Tutorials/tutorials/", widgets: 0 },
  { path: "/docs/Code/Tutorials/first-button/", widgets: 1 },
  { path: "/docs/Code/Tutorials/first-sequence/", widgets: 1 },
  { path: "/docs/Code/Tutorials/first-rule/", widgets: 1 },
  { path: "/docs/Code/Tutorials/joystick-deadband/", widgets: 2 },
  { path: "/docs/Code/Tutorials/unit-conversions/", widgets: 3 },
  { path: "/docs/Code/Tutorials/swerve-module-optimization/", widgets: 3 },
  { path: "/docs/Code/Controls/tuning/", widgets: 0 },
  { path: "/docs/Code/Controls/tuning-flywheel/", widgets: 1 },
  { path: "/docs/Code/Controls/tuning-arm/", widgets: 1 },
  { path: "/docs/Code/Controls/tuning-elevator/", widgets: 1 },
  { path: "/docs/Code/Controls/operator-interface/", widgets: 1 },
  { path: "/docs/Code/Autonomous/planning-an-auto/", widgets: 1 }
];

for (const { path, widgets } of PAGES) {
  test(`page loads: ${path}`, async ({ page }) => {
    const errors = watchForErrors(page);

    const response = await page.goto(path, { waitUntil: "networkidle" });
    expect(response.status()).toBe(200);
    await page.waitForTimeout(800);

    expect(await page.locator(".cz-exercise").count()).toBe(widgets);

    // Wide content must scroll in its own box, never the page body.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, "the page scrolls sideways").toBeLessThanOrEqual(0);

    await expectNoErrors(errors);
  });
}

test("every internal link on a tutorial page resolves", async ({ page, baseURL }) => {
  const seen = new Map();

  for (const { path } of PAGES) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const hrefs = await page.locator("#main-content a[href]").evaluateAll((els) =>
      els.map((a) => a.getAttribute("href")).filter((h) => h && !/^(https?:|#|mailto:)/.test(h))
    );
    for (const href of hrefs) {
      const url = new URL(href, baseURL + path).toString();
      if (seen.has(url)) continue;
      const res = await page.request.get(url);
      seen.set(url, res.status());
    }
  }

  const broken = [...seen].filter(([, status]) => status >= 400);
  expect(broken, `broken links: ${JSON.stringify(broken)}`).toEqual([]);
  expect(seen.size).toBeGreaterThan(10);
});
