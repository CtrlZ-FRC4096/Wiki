import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { watchForErrors, expectNoErrors, runExercise } from "./helpers.mjs";

/*
 * Python lesson 7 loads a browser copy of RobotPy (assets/py/robotpy) into
 * Pyodide before each run. These tests check that path in a real browser:
 * the library loads, every starter fails, every solution passes, and a second
 * run starts from a clean scheduler.
 *
 * tools/validate-exercises.py and tools/validate-robotpy-browser.py check the
 * same exercises in plain Python and against the real RobotPy.
 *
 * On a computer that cannot reach cdn.jsdelivr.net, install Pyodide from npm
 * (npm install pyodide@0.29.4, the PYODIDE_VERSION in python-worker.js) and
 * set CZ_PYODIDE_DIR to its node_modules/pyodide folder. The tests then serve
 * Pyodide from that folder.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, "..", "..", "..", "_data", "exercises");
const PAGE = "/docs/Code/Python%20Tutorials/07%20robotpy%20in%20our%20code/";

const GRADED = [
  "py7_hopper",
  "py7_phoenix",
  "py7_geometry",
  "py7_drive_math",
  "py7_oi",
  "py7_commands",
  "py7_autos",
  "py7_dashboard",
  "py7_robot"
];

function blockOf(id, key) {
  const text = readFileSync(join(DATA, id + ".yml"), "utf8");
  const start = text.indexOf("\n" + key + ": |");
  if (start === -1) throw new Error("no " + key + " block in " + id);
  const body = text.slice(text.indexOf("\n", start + 1) + 1);
  const lines = [];
  for (const line of body.split("\n")) {
    if (line.trim() && !line.startsWith("  ")) break;
    lines.push(line.replace(/^ {2}/, ""));
  }
  return lines.join("\n").trimEnd();
}

const TYPES = { ".js": "text/javascript", ".mjs": "text/javascript", ".wasm": "application/wasm",
  ".json": "application/json", ".zip": "application/zip" };

test.beforeEach(async ({ context }) => {
  const dir = process.env.CZ_PYODIDE_DIR;
  if (!dir) return;
  await context.route(/cdn\.jsdelivr\.net\/pyodide\/v[^/]+\/full\/([^?]*)/, async (route) => {
    const file = join(dir, new URL(route.request().url()).pathname.split("/").pop());
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "not in CZ_PYODIDE_DIR" });
    return route.fulfill({ body: readFileSync(file), contentType: TYPES[extname(file)] || "application/octet-stream" });
  });
});

test("every lesson 7 exercise is on the page and graded", async ({ page }) => {
  test.setTimeout(600_000);
  const errors = watchForErrors(page);
  await page.goto(PAGE, { waitUntil: "networkidle" });

  for (const id of GRADED) {
    const exercise = page.locator(`.cz-pyex[data-exercise-id="${id}"]`);
    await expect(exercise, `${id} is not on the page`).toHaveCount(1);
    expect(await exercise.getAttribute("data-library-url")).toContain("/assets/py/robotpy/manifest.json");

    const rejected = await runExercise(exercise, blockOf(id, "starter"));
    expect(rejected, `${id} accepts its starter`).toContain("failed");
    const message = await exercise.locator(".cz-exercise__check.is-fail .cz-exercise__check-message")
      .first().textContent();
    expect(message.trim().length, `${id} fails with no message`).toBeGreaterThan(10);

    const accepted = await runExercise(exercise, blockOf(id, "solution"));
    expect(accepted, `${id} rejected its own solution`).toContain("All the checks passed");
  }

  await expectNoErrors(errors);
});

test("the Try it block imports the robot libraries and runs a command", async ({ page }) => {
  test.setTimeout(300_000);
  const errors = watchForErrors(page);
  await page.goto(PAGE, { waitUntil: "networkidle" });
  const exercise = page.locator('.cz-pyex[data-exercise-id="py7_try"]');
  await exercise.locator('[data-action="run"]').click();
  const printed = exercise.locator(".cz-exercise__stdout");
  await printed.waitFor({ state: "visible", timeout: 240_000 });
  const text = await printed.textContent();
  expect(text).toContain("distance to the hub");
  expect(text).toContain("loop 3");
  expect(text).toContain("the command is done");
  await expect(exercise.locator(".cz-exercise__error")).toHaveCount(0);
  await expectNoErrors(errors);
});

test("each run starts with a new scheduler", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto(PAGE, { waitUntil: "networkidle" });
  const exercise = page.locator('.cz-pyex[data-exercise-id="py7_try"]');
  // The scheduler is a singleton. If the modules were not loaded again, the
  // command from the first run would still be scheduled in the second.
  const code = [
    "from commands2 import CommandScheduler, WaitCommand",
    "import cz_sim",
    "cz_sim.reset()",
    "print('before', CommandScheduler.getInstance()._scheduledCommands.__len__())",
    "CommandScheduler.getInstance()._cz_marker = getattr(CommandScheduler.getInstance(), '_cz_marker', 0) + 1",
    "print('marker', CommandScheduler.getInstance()._cz_marker)"
  ].join("\n");
  for (let i = 0; i < 2; i++) {
    await exercise.locator(".cz-exercise__code").fill(code);
    await exercise.locator('[data-action="run"]').click();
    const printed = exercise.locator(".cz-exercise__stdout");
    await printed.waitFor({ state: "visible", timeout: 240_000 });
    expect(await printed.textContent(), `run ${i + 1} reused the old modules`).toContain("marker 1");
  }
});
