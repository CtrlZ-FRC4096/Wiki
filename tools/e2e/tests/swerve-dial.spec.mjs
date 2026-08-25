import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { watchForErrors, expectNoErrors, setSlider } from "./helpers.mjs";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const CZSwerve = require(join(HERE, "..", "..", "..", "assets", "js", "interactive", "swerve-core.js"));

const PATH = "/docs/Code/Tutorials/swerve-module-optimization/";

test("the dial reports what the maths says", async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto(PATH, { waitUntil: "networkidle" });
  const dial = page.locator(".cz-dial");
  await page.waitForTimeout(600);

  const painted = await dial.locator("canvas").evaluate((c) => {
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  });
  expect(painted, "the dial drew nothing").toBeGreaterThan(1000);

  const readValue = async (label) =>
    (await dial.locator(`.cz-dial__table tr:has(th:text-is("${label}")) td`).textContent()).trim();

  for (const [current, target] of [[0, 170], [0, 30], [-95, 120], [-175, 175], [90, -90]]) {
    await setSlider(dial, "cz-dial-current", current);
    await setSlider(dial, "cz-dial-target", target);
    await page.waitForTimeout(150);

    const expected = CZSwerve.compare(current, target, 3);
    expect(await readValue("turn without optimising")).toBe(`${expected.naiveTurn.toFixed(0)}°`);
    expect(await readValue("turn with optimising")).toBe(`${expected.optimizedTurn.toFixed(0)}°`);
    expect(await readValue("module goes to")).toBe(`${expected.optimizedAngle.toFixed(0)}°`);
  }
  await expectNoErrors(errors);
});

test("the dial covers the full turn of a module", async ({ page }) => {
  await page.goto(PATH, { waitUntil: "networkidle" });
  const dial = page.locator(".cz-dial");
  // A module angle outside this range is the same as one inside it, so the
  // sliders cover -180 to 180 and nothing else is needed.
  for (const id of ["cz-dial-current", "cz-dial-target"]) {
    const input = dial.locator("#" + id);
    expect(await input.getAttribute("min")).toBe("-180");
    expect(await input.getAttribute("max")).toBe("180");
  }
});

test("a module never turns more than 90 degrees", async ({ page }) => {
  await page.goto(PATH, { waitUntil: "networkidle" });
  const dial = page.locator(".cz-dial");

  await setSlider(dial, "cz-dial-current", 0);
  await setSlider(dial, "cz-dial-target", 180);
  await page.waitForTimeout(150);
  const note = await dial.locator(".cz-dial__note").textContent();
  expect(note).toContain("180°");
  expect(note).toContain("reverses the wheel");

  // The worst-case button must always land on a command 180 degrees away.
  await setSlider(dial, "cz-dial-current", 45);
  await dial.locator('[data-action="worst"]').click();
  await page.waitForTimeout(150);
  const turn = await dial.locator('.cz-dial__table tr:has(th:text-is("turn with optimising")) td').textContent();
  expect(turn.trim()).toBe("0°");
});
