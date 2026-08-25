import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { watchForErrors, expectNoErrors, runExercise } from "./helpers.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, "..", "..", "..", "_data", "exercises");

/* Read the solution straight out of the exercise file, so these tests cannot
 * drift away from the content they are checking. The YAML here is simple
 * enough to read with a small parser and no dependency. */
function solutionOf(id) {
  const text = readFileSync(join(DATA, id + ".yml"), "utf8");
  const start = text.indexOf("\nsolution: |");
  if (start === -1) throw new Error("no solution block in " + id);
  const body = text.slice(text.indexOf("\n", start + 1) + 1);
  const lines = [];
  for (const line of body.split("\n")) {
    if (line.trim() && !line.startsWith("  ")) break;
    lines.push(line.replace(/^ {2}/, ""));
  }
  return lines.join("\n").trimEnd();
}

const PAGES = {
  "/docs/Code/Tutorials/joystick-deadband/": ["deadband", "deadband_scaled"],
  "/docs/Code/Tutorials/unit-conversions/": ["falcon_rpm", "falcon_mps", "cancoder_roundtrip"],
  "/docs/Code/Tutorials/swerve-module-optimization/": ["angle_wrap", "swerve_optimize"]
};

test("every exercise file has a page that grades it", () => {
  const onPages = Object.values(PAGES).flat().sort();
  const onDisk = readdirSync(DATA).filter((f) => f.endsWith(".yml")).map((f) => f.replace(".yml", "")).sort();
  expect(onPages, "an exercise exists that no page uses, or the other way round").toEqual(onDisk);
});

for (const [path, ids] of Object.entries(PAGES)) {
  test(`exercises are graded: ${path}`, async ({ page }) => {
    const errors = watchForErrors(page);
    await page.goto(path, { waitUntil: "networkidle" });

    const blocks = page.locator(".cz-pyex");
    expect(await blocks.count()).toBe(ids.length);

    for (let i = 0; i < ids.length; i++) {
      const exercise = blocks.nth(i);

      // Code that does nothing must be rejected, with a message on each check.
      const rejected = await runExercise(exercise, "x = 1");
      expect(rejected, `${ids[i]} accepted empty code`).toContain("failed");
      const failed = exercise.locator(".cz-exercise__check.is-fail");
      expect(await failed.count()).toBeGreaterThan(0);
      const message = await failed.locator(".cz-exercise__check-message").first().textContent();
      expect(message.trim().length, `${ids[i]} has a check with no message`).toBeGreaterThan(10);

      // The published solution must be accepted.
      const accepted = await runExercise(exercise, solutionOf(ids[i]));
      expect(accepted, `${ids[i]} rejected its own solution`).toContain("All the checks passed");
      await expect(exercise).toHaveClass(/is-solved/);
    }

    await expectNoErrors(errors);
  });
}

test("a loop that never ends is stopped, and the page survives it", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/docs/Code/Tutorials/joystick-deadband/", { waitUntil: "networkidle" });
  const exercise = page.locator(".cz-pyex").first();

  await runExercise(exercise, "while True:\n    pass");
  const box = exercise.locator(".cz-exercise__error");
  await expect(box).toBeVisible();
  expect((await box.textContent()).toLowerCase()).toContain("stopped");

  // The page still works, and so does the next run.
  expect(await page.evaluate(() => 1 + 1)).toBe(2);
  const after = await runExercise(exercise, solutionOf("deadband"));
  expect(after, "the widget did not recover after killing a runaway loop").toContain("All the checks passed");
});

test("work is kept when the page is reloaded", async ({ page }) => {
  await page.goto("/docs/Code/Tutorials/unit-conversions/", { waitUntil: "networkidle" });
  const exercise = page.locator(".cz-pyex").first();
  await runExercise(exercise, solutionOf("falcon_rpm"));

  await page.reload({ waitUntil: "networkidle" });
  const reloaded = page.locator(".cz-pyex").first();
  expect(await reloaded.locator(".cz-exercise__code").inputValue()).toContain("def falcon_to_rpm");
  await expect(reloaded).toHaveClass(/is-solved/);
});
