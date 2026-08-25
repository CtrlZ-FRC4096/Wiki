import { test, expect } from "@playwright/test";
import { watchForErrors, expectNoErrors, chip } from "./helpers.mjs";

const PATH = "/docs/Code/Controls/operator-interface/";

const BINDINGS = `@driver.LEFT_TRIGGER_AS_BUTTON.whenHeld
def _():
    robot.intake_running = True

@driver.LEFT_TRIGGER_AS_BUTTON.whenReleased
def _():
    robot.intake_running = False

@driver.A.whenPressed
def _():
    robot.shooter_spinning = True

@driver.RIGHT_TRIGGER_AS_BUTTON.whenPressed
def _():
    robot.shoot = True`;

async function loadBindings(page, oi, code) {
  await oi.locator(".cz-oi__code").fill(code);
  await oi.locator('[data-action="load"]').click();
  await page.waitForFunction(
    () => {
      const log = document.querySelector(".cz-oi__log");
      const err = document.querySelector(".cz-oi .cz-exercise__error");
      return Boolean(err) || Boolean(log && log.textContent.includes("Bindings loaded"));
    },
    null,
    { timeout: 240_000 }
  );
}

test("a syntax error is reported, not swallowed", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto(PATH, { waitUntil: "networkidle" });
  const oi = page.locator(".cz-oi");

  await loadBindings(page, oi, "@driver.A.whenPressed\ndef _(:\n    pass");
  const box = oi.locator(".cz-exercise__error");
  await expect(box).toBeVisible();
  expect(await box.textContent()).toContain("SyntaxError");
});

test("the bindings drive a full scoring cycle", async ({ page }) => {
  test.setTimeout(420_000);
  const errors = watchForErrors(page);
  await page.goto(PATH, { waitUntil: "networkidle" });
  const oi = page.locator(".cz-oi");

  await loadBindings(page, oi, BINDINGS);
  await oi.locator(".cz-oi__stage").click();

  const poseX = async () => parseFloat((await chip(oi, "pose")).split(",")[0]);

  /* The widget marks the pose chip when the robot is inside the depot. Drive
   * until it says so, rather than to a coordinate: the robot coasts about a
   * metre after the key is released, which from the far side of the field can
   * carry it straight out of the far edge of the zone. */
  const inDepot = () =>
    oi.locator('.cz-oi__chip:has(.cz-oi__chip-label:text-is("pose"))').evaluate(
      (node) => node.classList.contains("is-on")
    );

  async function driveIntoDepot(limitMs = 20_000) {
    const started = Date.now();
    while (Date.now() - started < limitMs) {
      if (await inDepot()) return true;
      const x = await poseX();
      const key = x > 2.6 ? "KeyA" : "KeyD";
      await page.keyboard.down(key);
      await page.waitForTimeout(180);
      await page.keyboard.up(key);
      await page.waitForTimeout(140);
    }
    return await inDepot();
  }

  async function driveTo(targetX, limitMs = 20_000) {
    const key = (await poseX()) > targetX ? "KeyA" : "KeyD";
    const arrived = key === "KeyA" ? (x) => x <= targetX : (x) => x >= targetX;
    await page.keyboard.down(key);
    const started = Date.now();
    while (Date.now() - started < limitMs) {
      if (arrived(await poseX())) break;
      await page.waitForTimeout(50);
    }
    await page.keyboard.up(key);
    await page.waitForTimeout(250);
  }

  async function waitForChip(label, want, limitMs = 10_000) {
    const started = Date.now();
    while (Date.now() - started < limitMs) {
      if ((await chip(oi, label)) === want) return true;
      await page.waitForTimeout(60);
    }
    return false;
  }

  for (let cycle = 1; cycle <= 2; cycle++) {
    expect(await driveIntoDepot(), `cycle ${cycle}: never reached the depot`).toBe(true);
    await page.keyboard.down("Shift");
    expect(await waitForChip("fuel", "loaded"), `cycle ${cycle}: the intake collected nothing`).toBe(true);
    await page.keyboard.up("Shift");
    await page.waitForTimeout(300);
    expect(await chip(oi, "intake"), `cycle ${cycle}: whenReleased did not stop the intake`).toBe("off");

    await page.keyboard.press("KeyJ");
    await driveTo(11.5);
    expect(await waitForChip("shooter", "100%"), `cycle ${cycle}: the shooter never reached speed`).toBe(true);
    await page.keyboard.press("KeyL");
    await page.waitForTimeout(400);
    expect(await chip(oi, "score")).toBe(`${cycle} / 2`);
  }

  await expect(oi).toHaveClass(/is-solved/);
  await expect(oi.locator(".cz-exercise__verdict.is-pass")).toBeVisible();
  await expectNoErrors(errors);
});

test("Reset robot keeps the bindings, Restore starter code replaces them", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto(PATH, { waitUntil: "networkidle" });
  const oi = page.locator(".cz-oi");

  await loadBindings(page, oi, BINDINGS);
  await oi.locator('[data-action="reset"]').click();
  await page.waitForTimeout(300);
  expect(await oi.locator(".cz-oi__code").inputValue(),
    "Reset robot must not touch the editor").toContain("whenReleased");
  expect(await chip(oi, "score")).toBe("0 / 2");

  page.once("dialog", (d) => d.accept());
  await oi.locator('[data-action="restore"]').click();
  await page.waitForTimeout(300);
  expect(await oi.locator(".cz-oi__code").inputValue(),
    "Restore starter code must replace the editor").not.toContain("whenReleased");
});
