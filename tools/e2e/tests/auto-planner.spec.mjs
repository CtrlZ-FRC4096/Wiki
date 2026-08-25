import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { watchForErrors, expectNoErrors } from "./helpers.mjs";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const JS = join(HERE, "..", "..", "..", "assets", "js", "interactive");
const CZAuto = require(join(JS, "auto-core.js"));
const CZField = require(join(JS, "field-sim.js"));

const PATH = "/docs/Code/Autonomous/planning-an-auto/";
const STORAGE = "czwiki.autoplanner.v3";

/* A route that satisfies the objective. The corridor heights and the firing
 * point come from the field layout, so moving a barrier moves this too. */
const LOW = 3.0, HIGH = 4.8;
const STANDOFF = CZAuto.SHOT_RANGE * 0.98;
const FIRE = { x: CZAuto.GOAL.x - STANDOFF * 0.94, y: CZAuto.GOAL.y + STANDOFF * 0.34 };

const SOLUTION = {
  name: "wiki_auto",
  startPose: { ...CZAuto.START },
  steps: [
    { kind: "path", waypoints: [{ x: 4.6, y: LOW }, { x: 8.0, y: LOW }, { x: 9.7, y: HIGH }, FIRE],
      endHeading: 0, parallel: ["spin_up_shooter"] },
    { kind: "action", action: "shoot", timeout: 0.6 },
    { kind: "path", waypoints: [{ x: 9.7, y: HIGH }, { x: 8.0, y: LOW }, { x: 5.5, y: LOW }, { x: CZAuto.LOAD.x, y: CZAuto.LOAD.y }],
      endHeading: 0, parallel: ["intake"] },
    { kind: "action", action: "intake", timeout: 0.7 },
    { kind: "path", waypoints: [{ x: 5.5, y: LOW }, { x: 8.0, y: LOW }, { x: 9.7, y: HIGH }, FIRE],
      endHeading: 0, parallel: ["spin_up_shooter"] },
    { kind: "action", action: "shoot", timeout: 0.6 }
  ]
};

async function seed(page, routine) {
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)),
    { key: STORAGE, value: { routine, limits: { maxV: 4.5, maxA: 4.5 } } }
  );
}

test("the default routine does not yet satisfy the objective", async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto(PATH, { waitUntil: "networkidle" });
  const auto = page.locator(".cz-auto");

  await auto.locator('[data-action="check"]').click();
  await expect(auto.locator(".cz-exercise__verdict")).toBeVisible();
  expect(await auto.locator(".cz-exercise__verdict").textContent()).toContain("not correct");
  expect(await auto.locator(".cz-exercise__check.is-fail").count()).toBeGreaterThan(0);
  await expectNoErrors(errors);
});

test("a planned route satisfies every check", async ({ page }) => {
  const errors = watchForErrors(page);
  await seed(page, SOLUTION);
  await page.goto(PATH, { waitUntil: "networkidle" });
  const auto = page.locator(".cz-auto");

  await auto.locator('[data-action="check"]').click();
  await expect(auto.locator(".cz-exercise__verdict.is-pass")).toBeVisible();
  expect(await auto.locator(".cz-exercise__check.is-fail").count()).toBe(0);
  await expect(auto).toHaveClass(/is-solved/);

  const code = await auto.locator(".cz-auto__code").textContent();
  expect(code).toContain("SequentialCommandGroup");
  expect(code).toContain("ParallelCommandGroup");
  expect(code).toContain("coroutines.intake");
  await expectNoErrors(errors);
});

test("a straight line at the goal hits a barrier", async ({ page }) => {
  await seed(page, {
    name: "wiki_auto",
    startPose: { ...CZAuto.START },
    steps: [
      { kind: "path", waypoints: [FIRE], endHeading: 0, parallel: ["spin_up_shooter"] },
      { kind: "action", action: "shoot", timeout: 0.6 }
    ]
  });
  await page.goto(PATH, { waitUntil: "networkidle" });
  const auto = page.locator(".cz-auto");
  await auto.locator('[data-action="check"]').click();
  await expect(auto.locator(".cz-exercise__verdict")).toBeVisible();
  const first = await auto.locator(".cz-exercise__check.is-fail .cz-exercise__check-message").first().textContent();
  expect(first).toContain("barrier");
});

test("the start pose is fixed and cannot be dragged", async ({ page }) => {
  const errors = watchForErrors(page);
  // Even a saved routine with a moved start must be corrected on load.
  await seed(page, { ...SOLUTION, startPose: { x: 9.9, y: 7.2, heading: 90 } });
  await page.goto(PATH, { waitUntil: "networkidle" });
  const auto = page.locator(".cz-auto");
  await page.waitForTimeout(600);

  const startText = () => auto.locator(".cz-auto__step--start .cz-auto__step-body").textContent();
  const expected = `${CZAuto.START.x.toFixed(2)}, ${CZAuto.START.y.toFixed(2)} m`;
  expect(await startText(), "a saved start pose overrode the task").toContain(expected);
  expect(await auto.locator(".cz-auto__step--start input").count(),
    "the start row still offers an input").toBe(0);

  // Convert metres to viewport pixels the same way the widget does.
  await auto.locator("canvas").scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const box = await auto.locator("canvas").boundingBox();
  const margin = 8;
  const scale = Math.min(
    (box.width - margin * 2) / CZField.FIELD.length,
    (box.height - margin * 2) / CZField.FIELD.width
  );
  const originX = (box.width - CZField.FIELD.length * scale) / 2;
  const originY = (box.height - CZField.FIELD.width * scale) / 2;
  const marker = {
    x: box.x + originX + CZAuto.START.x * scale,
    y: box.y + originY + (CZField.FIELD.width - CZAuto.START.y) * scale
  };

  const stepsBefore = await auto.locator(".cz-auto__step").nth(1).textContent();
  await page.mouse.move(marker.x, marker.y);
  await page.mouse.down();
  await page.mouse.move(marker.x + 240, marker.y - 120, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  expect(await startText(), "the start pose moved").toContain(expected);
  expect(await auto.locator(".cz-auto__step").nth(1).textContent(),
    "clicking the start marker added a stray waypoint").toBe(stepsBefore);
  await expectNoErrors(errors);
});
