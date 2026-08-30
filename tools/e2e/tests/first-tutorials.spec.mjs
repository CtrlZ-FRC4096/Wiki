import { test, expect } from "@playwright/test";
import { watchForErrors, expectNoErrors } from "./helpers.mjs";

/* These three are for a student on a phone, so test them at a phone size with
 * touch on. Set the properties instead of using a device preset: the presets
 * for real phones ask for WebKit, and the setup instructions only install
 * Chromium. Everything here uses taps: no keyboard, no drag, no hover. */
test.use({
  viewport: { width: 390, height: 780 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true
});

const BUTTON = "/docs/Code/Tutorials/first-button/";
const SEQUENCE = "/docs/Code/Tutorials/first-sequence/";
const RULE = "/docs/Code/Tutorials/first-rule/";

/* Apple and Google both put the smallest comfortable touch target at 44px. */
async function everyTargetIsBigEnough(page) {
  return page.evaluate(() => {
    const controls = [...document.querySelectorAll(
      ".cz-basic button, .cz-basic input")];
    return controls
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { text: (el.textContent || el.className).trim().slice(0, 24), h: Math.round(r.height), w: Math.round(r.width) };
      })
      .filter((t) => t.h > 0 && t.h < 44);
  });
}

test("the pages fit a phone and every control is thumb sized", async ({ page }) => {
  for (const path of [BUTTON, SEQUENCE, RULE]) {
    const errors = watchForErrors(page);
    await page.goto(path, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0);

    const small = await everyTargetIsBigEnough(page);
    expect(small, `${path} has controls under 44px: ${JSON.stringify(small)}`).toEqual([]);

    // Nothing here may need typing.
    expect(await page.locator(".cz-basic textarea").count(), `${path} asks for typing`).toBe(0);

    // The code panel is always on screen, not hidden behind a control.
    await expect(page.locator(".cz-basic__code"), `${path} hides the code`).toBeVisible();
    expect(await page.locator(".cz-basic details").count(), `${path} hides the code behind a disclosure`).toBe(0);

    await expectNoErrors(errors);
  }
});

test("give a button a job: all three tasks, in order", async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto(BUTTON, { waitUntil: "networkidle" });
  const widget = page.locator(".cz-bind");
  await page.waitForTimeout(500);

  // Nothing chosen yet. It must not pass, and it must say what to do next
  // rather than only that the answer is wrong.
  await widget.locator('[data-action="check"]').tap();
  const firstHint = widget.locator(".cz-exercise__verdict.is-fail");
  await expect(firstHint).toBeVisible();
  expect((await firstHint.textContent()).length,
    "the failure gives no useful hint").toBeGreaterThan(20);
  expect(await widget.locator(".cz-bind__task.is-done").count()).toBe(0);

  // The wrong "when": the intake never stops.
  await widget.locator(".cz-basic__opt", { hasText: "Run the intake" }).tap();
  await widget.locator(".cz-basic__opt", { hasText: "Once when I press it" }).tap();
  const pad = widget.locator(".cz-bind__pad", { hasText: "Left trigger" });
  await pad.dispatchEvent("pointerdown");
  await page.waitForTimeout(400);
  await pad.dispatchEvent("pointerup");
  await page.waitForTimeout(600);

  const warning = widget.locator(".cz-basic__warning");
  await expect(warning, "the still-running warning did not appear").toHaveClass(/is-on/);
  expect(await warning.textContent()).toContain("still running");
  expect(await widget.locator(".cz-basic__code").textContent()).toContain("Nothing sets it back");

  // The right "when".
  await widget.locator(".cz-basic__opt", { hasText: "While I hold it" }).tap();
  await pad.dispatchEvent("pointerdown");
  await page.waitForTimeout(400);
  await pad.dispatchEvent("pointerup");
  await page.waitForTimeout(400);
  await expect(warning).not.toHaveClass(/is-on/);

  await widget.locator('[data-action="check"]').tap();
  expect(await widget.locator(".cz-exercise__verdict").textContent()).toContain("Correct");
  expect(await widget.locator(".cz-bind__task.is-done").count(), "task 1 was not ticked").toBe(1);

  let code = await widget.locator(".cz-basic__code").textContent();
  expect(code).toContain("whenHeld");
  expect(code).toContain("whenReleased");

  // Task 2: the shooter must keep running after the button is released.
  await widget.locator(".cz-bind__tab", { hasText: "A" }).tap();
  await widget.locator(".cz-basic__opt", { hasText: "Start the shooter" }).tap();
  await widget.locator(".cz-basic__opt", { hasText: "Once when I press it" }).tap();
  const padA = widget.locator(".cz-bind__pad", { hasText: "A" });
  await padA.dispatchEvent("pointerdown");
  await page.waitForTimeout(200);
  await padA.dispatchEvent("pointerup");
  await page.waitForTimeout(500);
  await widget.locator('[data-action="check"]').tap();
  expect(await widget.locator(".cz-exercise__verdict").textContent()).toContain("Correct");
  expect(await widget.locator(".cz-bind__task.is-done").count()).toBe(2);

  // Task 3: nothing stops the shooter yet, so give B that job.
  await widget.locator(".cz-bind__tab", { hasText: "B" }).tap();
  await widget.locator(".cz-basic__opt", { hasText: "Stop the shooter" }).tap();
  const padB = widget.locator(".cz-bind__pad", { hasText: "B" });
  await padB.dispatchEvent("pointerdown");
  await page.waitForTimeout(200);
  await padB.dispatchEvent("pointerup");
  await page.waitForTimeout(300);
  await widget.locator('[data-action="check"]').tap();
  await expect(widget).toHaveClass(/is-solved/);
  expect(await widget.locator(".cz-bind__task.is-done").count()).toBe(3);

  code = await widget.locator(".cz-basic__code").textContent();
  expect(code).toContain("shooter_spinning = True");
  expect(code).toContain("shooter_spinning = False");
  await expectNoErrors(errors);
});

test("put the steps in order: the intake may be started before the drive", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(SEQUENCE, { waitUntil: "networkidle" });
  const widget = page.locator(".cz-seq");
  await page.waitForTimeout(400);

  // Intake first, then drive. A real routine does this.
  for (const label of ["Lower the intake", "Run the intake", "Drive to the game piece", "Drive to the goal", "Shoot"]) {
    await widget.locator(".cz-seq__card", { hasText: label }).tap();
  }
  await widget.locator('[data-action="play"]').tap();
  await widget.locator(".cz-exercise__verdict").waitFor({ timeout: 90_000 });
  expect(await widget.locator(".cz-exercise__verdict").textContent(),
    "starting the intake before the drive should still score").toContain("Correct");
});

test("put the steps in order: the right order scores, a wrong order does not", async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchForErrors(page);
  await page.goto(SEQUENCE, { waitUntil: "networkidle" });
  const widget = page.locator(".cz-seq");
  await page.waitForTimeout(500);

  const add = async (label) => widget.locator(".cz-seq__card", { hasText: label }).tap();
  const play = async () => {
    await widget.locator('[data-action="play"]').tap();
    await widget.locator(".cz-exercise__verdict").waitFor({ timeout: 90_000 });
    return (await widget.locator(".cz-exercise__verdict").textContent()).trim();
  };

  // Shooting before collecting must fail, and must say why.
  await add("Shoot");
  await add("Drive to the goal");
  expect(await play()).toContain("Not correct");
  const why = await widget.locator(".cz-exercise__check.is-fail .cz-exercise__check-message").first().textContent();
  expect(why.length).toBeGreaterThan(20);

  // The right order.
  await widget.locator('[data-action="clear"]').tap();
  await add("Lower the intake");
  await add("Drive to the game piece");
  await add("Run the intake");
  await add("Drive to the goal");
  await add("Shoot");
  expect(await widget.locator(".cz-seq__row").count()).toBe(5);
  expect(await play()).toContain("Correct");
  await expect(widget).toHaveClass(/is-solved/);

  expect(await widget.locator(".cz-basic__code").textContent()).toContain("SequentialCommandGroup");
  await expectNoErrors(errors);
});

test("teach the robot to decide: the scale shows the answer, and Play restarts", async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchForErrors(page);
  await page.goto(RULE, { waitUntil: "networkidle" });
  const widget = page.locator(".cz-rule");
  await page.waitForTimeout(500);

  const setThreshold = async (value) =>
    widget.locator(".cz-rule__slider").evaluate((node, v) => {
      node.value = String(v);
      node.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);

  const play = async () => {
    await widget.locator('[data-action="play"]').tap();
    await widget.locator(".cz-exercise__verdict").waitFor({ timeout: 60_000 });
    return (await widget.locator(".cz-exercise__verdict").textContent()).trim();
  };

  // Too large: the intake stops before the piece is inside.
  await setThreshold(35);
  expect(await play()).toContain("Not correct");

  // Too small: the rule never happens and the piece jams.
  await setThreshold(2);
  expect(await play()).toContain("Not correct");

  // In range.
  await setThreshold(12);
  expect(await play()).toContain("Correct");
  await expect(widget).toHaveClass(/is-solved/);

  // A sensor that never changes cannot decide anything.
  await widget.locator(".cz-basic__opt", { hasText: "the battery voltage" }).tap();
  expect(await play()).toContain("Not correct");

  expect(await widget.locator(".cz-basic__code").textContent()).toContain("def periodic(self):");

  // The rule marker moves with the slider, so the answer is visible before
  // anything is played.
  const markAt = () => widget.locator(".cz-rule__mark").evaluate((n) => n.style.left);
  await setThreshold(20);
  const high = await markAt();
  await setThreshold(8);
  expect(await markAt(), "the rule marker does not follow the slider").not.toBe(high);

  // Play always starts again, whatever happened last time.
  await widget.locator('[data-action="play"]').tap();
  await page.waitForTimeout(150);
  expect(await widget.locator('[data-action="play"]').textContent(),
    "Play should not turn into Stop").toContain("Play");
  expect(await widget.locator(".cz-exercise__verdict").count(),
    "the previous result was not cleared").toBe(0);

  await expectNoErrors(errors);
});
