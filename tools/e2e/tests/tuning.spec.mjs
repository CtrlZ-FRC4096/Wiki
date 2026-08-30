import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { watchForErrors, expectNoErrors, setSlider } from "./helpers.mjs";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
/* Take the reference gains from the simulator itself. If someone retunes a
 * plant, these tests follow it instead of failing on a stale number. */
const CZSim = require(join(HERE, "..", "..", "..", "assets", "js", "interactive", "mechanism-sim.js"));

const PAGES = {
  flywheel: "/docs/Code/Controls/tuning-flywheel/",
  arm: "/docs/Code/Controls/tuning-arm/",
  elevator: "/docs/Code/Controls/tuning-elevator/"
};

for (const [plantId, path] of Object.entries(PAGES)) {
  const plant = CZSim.plants[plantId];

  test(`${plantId}: the published gains pass, all-zero does not`, async ({ page }) => {
    const errors = watchForErrors(page);
    await page.goto(path, { waitUntil: "networkidle" });
    const sim = page.locator(".cz-sim");

    expect(await sim.locator('.cz-sim__sliders input[type="range"]').count())
      .toBe(plant.gains.length + 1); // one for each gain, plus the target

    await sim.locator('[data-action="reset"]').click();
    await sim.locator('[data-action="check"]').click();
    await expect(sim.locator(".cz-exercise__verdict")).toBeVisible();
    expect(await sim.locator(".cz-exercise__verdict").textContent()).toContain("not tuned");
    expect(await sim.locator(".cz-exercise__check.is-fail").count()).toBeGreaterThan(0);

    for (const gain of plant.gains) {
      await setSlider(sim, `cz-${plantId}-${gain}`, plant.reference[gain]);
    }
    await sim.locator('[data-action="check"]').click();
    await expect(sim.locator(".cz-exercise__verdict.is-pass")).toBeVisible();
    await expect(sim).toHaveClass(/is-solved/);

    await expectNoErrors(errors);
  });

  test(`${plantId}: each Isolate mode changes what runs`, async ({ page }) => {
    const errors = watchForErrors(page);
    await page.goto(path, { waitUntil: "networkidle" });
    const sim = page.locator(".cz-sim");

    const labels = await sim.locator(".cz-sim__mode").allTextContents();
    expect(labels).toEqual(plant.modes.map((m) => m.label));

    for (const mode of plant.modes) {
      await sim.locator(".cz-sim__mode", { hasText: mode.label }).click();
      await page.waitForTimeout(250);

      // The note tells the student what this mode is for.
      expect((await sim.locator(".cz-sim__mode-note").textContent()).trim()).toBe(mode.note);

      // Gains the mode holds at zero must be greyed out, and the rest must not.
      const live = await sim.locator('.cz-sim__slider input[type="range"]:not(:disabled)')
        .evaluateAll((els) => els.map((e) => e.id.split("-").pop()));
      for (const gain of plant.gains) {
        if (gain in mode.force) {
          expect(live, `${mode.label} left ${gain} enabled`).not.toContain(gain);
        } else {
          expect(live, `${mode.label} disabled ${gain}, which it does not force`).toContain(gain);
        }
      }
    }

    await expectNoErrors(errors);
  });

  test(`${plantId}: the modes really do run different things`, () => {
    /* Checked against the model rather than the drawing. Sampling a moving
     * plot and comparing pixels looks stronger but is not: under load two
     * samples can land on the same frame, and the test fails for no reason. */
    const sp = plant.setpoint.value;
    const traces = plant.modes.map((mode) => {
      const gains = Object.assign({}, plant.fixed);
      plant.gains.forEach((g) => { gains[g] = plant.reference[g]; });
      Object.keys(mode.force).forEach((g) => { gains[g] = mode.force[g]; });
      const run = CZSim.simulate(plantId, gains, sp, mode.scenario);
      return run.samples.map((s) => s.y.toFixed(3)).join(",");
    });
    expect(new Set(traces).size, "two modes produce an identical run").toBe(plant.modes.length);
  });
}

test("the flywheel model gives a fast wheel enough speed to miss long", () => {
  /* The page turns wheel speed into a made or missed shot with a 5% window.
   * The rule lives in the widget, but the speeds it acts on come from the
   * model, so check that a wrong kV really does land outside the window. */
  const sp = CZSim.plants.flywheel.setpoint.value;
  const ref = CZSim.plants.flywheel.reference;
  const speedFor = (gains) => CZSim.simulate("flywheel", gains, sp, "spinup").launchSpeed / sp;

  expect(Math.abs(speedFor(ref) - 1)).toBeLessThan(0.05);
  expect(speedFor({ ...ref, kV: 0.4 }), "a high kV should overshoot the window").toBeGreaterThan(1.05);
  expect(speedFor({ ...ref, kV: 0.18, kP: 0 }), "a low kV with no feedback should fall short").toBeLessThan(0.95);
});
