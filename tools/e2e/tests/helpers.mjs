import { expect } from "@playwright/test";

/* Playwright gives every test its own browser context, so localStorage starts
 * empty. Do not add an init script to clear it: an init script runs on every
 * navigation, including a reload, which would wipe the very state a test is
 * checking survives.
 */

/* Fail a test on any console error, rather than letting a broken widget
 * quietly pass because its happy path still rendered. */
export function watchForErrors(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return errors;
}

/* Put code in one exercise, run it, and return the verdict text. */
export async function runExercise(exercise, code) {
  await exercise.locator(".cz-exercise__code").fill(code);
  await exercise.locator('[data-action="run"]').click();
  await exercise.locator(".cz-exercise__verdict, .cz-exercise__error")
    .first().waitFor({ state: "visible", timeout: 240_000 });
  const verdict = exercise.locator(".cz-exercise__verdict");
  return (await verdict.count()) ? (await verdict.textContent()).trim() : "";
}

/* Move a slider and let the widget react to it. */
export async function setSlider(root, id, value) {
  await root.locator("#" + id).evaluate((node, v) => {
    node.value = String(v);
    node.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

/* Read one of the labelled chips a widget draws over its field view. */
export async function chip(root, label) {
  const value = root.locator(
    `.cz-oi__chip:has(.cz-oi__chip-label:text-is("${label}")) .cz-oi__chip-value`
  );
  return (await value.textContent()).trim();
}

export async function expectNoErrors(errors) {
  expect(errors, "the page logged console errors").toEqual([]);
}
