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
const STORAGE = "czwiki.autoplanner.v4";

/* A route that satisfies the objective. The corridor heights and the firing
 * point come from the field layout, so moving a barrier moves this too. */
const LOW = 3.2, HIGH = 4.6;
const STANDOFF = CZAuto.SHOT_RANGE * 0.98;
const FIRE = { x: CZAuto.GOAL.x - STANDOFF * 0.94, y: CZAuto.GOAL.y + STANDOFF * 0.34 };

// Above barrier B already? Then the climb ends at the firing point.
const CLIMB = FIRE.x > 10.6 ? [{ x: 9.7, y: HIGH }] : [];
const LOAD = { x: CZAuto.LOAD.x, y: CZAuto.LOAD.y };
const CYCLE = [
  { kind: "path", waypoints: [...CLIMB, { x: 8.0, y: LOW }, { x: LOAD.x + 1.5, y: LOW }, LOAD],
    endHeading: 0, parallel: ["intake"] },
  { kind: "action", action: "intake", timeout: 0.7 },
  { kind: "path", waypoints: [{ x: LOAD.x + 1.5, y: LOW }, { x: 8.0, y: LOW }, ...CLIMB, FIRE],
    endHeading: 0, parallel: ["spin_up_shooter"] },
  { kind: "action", action: "shoot", timeout: 0.6 }
];

const FIRST = [
  { kind: "path", waypoints: [{ x: 4.6, y: LOW }, { x: 8.0, y: LOW }, ...CLIMB, FIRE],
    endHeading: 0, parallel: ["spin_up_shooter"] },
  { kind: "action", action: "shoot", timeout: 0.6 }
];

/* Shoot the preloaded piece, then fetch one more. */
const SOLUTION = { name: "wiki_auto", startPose: { ...CZAuto.START }, steps: [...FIRST, ...CYCLE] };

/* The stretch goal: two more, never stopping. The intake runs on the way into
 * the LOAD zone and on the way out, so there is no wait there. */
const NONSTOP = CYCLE.filter((s) => s.kind !== "action" || s.action !== "intake").map((s) =>
  s.kind === "path" && s.parallel.includes("spin_up_shooter") ? { ...s, parallel: ["intake", "spin_up_shooter"] } : s);
const STRETCH = { name: "wiki_auto", startPose: { ...CZAuto.START }, steps: [...FIRST, ...NONSTOP, ...NONSTOP] };
const AT_THE_EDGE = { maxV: 4.0, maxA: 7.0 };

/* Limits that work: fast enough to fit, gentle enough not to slip much. */
const MODERATE = { maxV: 4.0, maxA: 5.0 };

async function seed(page, routine, limits = MODERATE) {
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)),
    { key: STORAGE, value: { routine, limits } }
  );
}

test("the default routine does not yet satisfy the objective", async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto(PATH, { waitUntil: "networkidle" });
  const auto = page.locator(".cz-auto");

  await auto.locator('[data-action="check"]').click();
  await expect(auto.locator(".cz-exercise__verdict")).toBeVisible();
  await expect(auto.locator(".cz-exercise__verdict.is-fail")).toBeVisible();
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

  // Twenty matches, enough of them working.
  await expect(auto.locator(".cz-auto__match")).toHaveCount(CZAuto.MATCHES);
  expect(await auto.locator(".cz-auto__match.is-pass").count()).toBeGreaterThanOrEqual(CZAuto.MATCHES_NEEDED);

  const code = await auto.locator(".cz-auto__code").textContent();
  expect(code).toContain("SequentialCommandGroup");
  expect(code).toContain("ParallelCommandGroup");
  expect(code).toContain("coroutines.intake");
  await expectNoErrors(errors);
});

test("the same route pushed to the limits slips and stops working", async ({ page }) => {
  const errors = watchForErrors(page);
  await seed(page, SOLUTION, { maxV: 6.5, maxA: 10 });
  await page.goto(PATH, { waitUntil: "networkidle" });
  const auto = page.locator(".cz-auto");

  await auto.locator('[data-action="check"]').click();
  await expect(auto.locator(".cz-exercise__verdict.is-fail")).toBeVisible();
  // It fits in the period easily; it just doesn't work.
  expect(await auto.locator(".cz-exercise__check.is-pass").first().textContent()).toContain(`${CZAuto.TIME_LIMIT} seconds`);
  const advice = await auto.locator(".cz-auto__advice").textContent();
  expect(advice).toContain("slipped");
  expect(advice).toContain("4.75 m/s");

  // Watching a failing match explains what went wrong in it.
  const failing = auto.locator(".cz-auto__match.is-fail").first();
  const which = (await failing.textContent()).trim();
  await failing.click();
  await expect(auto.locator(".cz-auto__match.is-shown")).toHaveText(which);
  expect(await auto.locator(".cz-auto__match-note").textContent()).toContain("Match " + which + ":");
  await expectNoErrors(errors);
});

test("very gentle limits work but run out of time", async ({ page }) => {
  await seed(page, SOLUTION, { maxV: 3.0, maxA: 2.0 });
  await page.goto(PATH, { waitUntil: "networkidle" });
  const auto = page.locator(".cz-auto");
  await auto.locator('[data-action="check"]').click();
  const failed = auto.locator(".cz-exercise__check.is-fail .cz-exercise__check-name");
  expect(await failed.first().textContent()).toContain(`${CZAuto.TIME_LIMIT} seconds`);
  // Nothing but the clock is wrong.
  expect(await auto.locator(".cz-exercise__check.is-pass").count()).toBe(3);
});

test("the stretch goal needs no stops and limits at the edge", async ({ page }) => {
  const errors = watchForErrors(page);
  await seed(page, STRETCH, AT_THE_EDGE);
  await page.goto(PATH, { waitUntil: "networkidle" });
  const auto = page.locator(".cz-auto");
  await auto.locator('[data-action="check"]').click();
  await expect(auto.locator(".cz-exercise__verdict.is-pass")).toBeVisible();
  await expect(auto.locator(".cz-auto__stretch.is-pass")).toBeVisible();
  expect(await auto.locator(".cz-auto__match.is-stretch").count()).toBeGreaterThanOrEqual(CZAuto.MATCHES_NEEDED);
  await expectNoErrors(errors);
});

test("the two-piece routine does not reach the stretch goal", async ({ page }) => {
  await seed(page, SOLUTION);
  await page.goto(PATH, { waitUntil: "networkidle" });
  const auto = page.locator(".cz-auto");
  await auto.locator('[data-action="check"]').click();
  await expect(auto.locator(".cz-auto__stretch")).toBeVisible();
  await expect(auto.locator(".cz-auto__stretch.is-pass")).toHaveCount(0);
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
  await auto.locator(".cz-auto__canvas").scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const box = await auto.locator(".cz-auto__canvas").boundingBox();
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
