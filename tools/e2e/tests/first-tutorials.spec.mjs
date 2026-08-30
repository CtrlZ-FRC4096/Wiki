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
      ".cz-basic button, .cz-basic input, .cz-basic summary")];
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

    await expectNoErrors(errors);
  }
});

test("give a button a job: the right answer passes, the wrong one is explained", async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto(BUTTON, { waitUntil: "networkidle" });
  const widget = page.locator(".cz-bind");
  await page.waitForTimeout(500);

  // Nothing chosen yet, so it must not pass.
  await widget.locator('[data-action="check"]').tap();
  expect(await widget.locator(".cz-exercise__verdict").textContent()).toContain("Not correct");

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
  await expect(widget.locator(".cz-exercise__verdict.is-pass")).toBeVisible();
  await expect(widget).toHaveClass(/is-solved/);

  const code = await widget.locator(".cz-basic__code").textContent();
  expect(code).toContain("whenHeld");
  expect(code).toContain("whenReleased");
  await expectNoErrors(errors);
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

test("teach the robot to decide: the threshold has to be in the right range", async ({ page }) => {
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
  await expectNoErrors(errors);
});
