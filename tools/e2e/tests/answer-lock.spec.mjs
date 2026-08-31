import { test, expect } from "@playwright/test";
import { watchForErrors, expectNoErrors } from "./helpers.mjs";

/* The answers are encrypted, so the password is a lock and not a curtain.
 * These check both halves of that claim: the answer is not in the page, and
 * the password brings it back.
 *
 * The password is not in the repository. Set it to run the unlocking tests:
 *
 *     CZ_ANSWER_PASSWORD='...' npx playwright test tests/answer-lock.spec.mjs
 */
const PASSWORD = process.env.CZ_ANSWER_PASSWORD;

const VISION = "/docs/Code/Challenges/vision-latency/";
const JAM = "/docs/Code/Challenges/jam-detector/";
const OI = "/docs/Code/Controls/operator-interface/";

/* Say yes to a confirm(), and give the next password to a prompt(). */
function answerDialogs(page, passwords) {
  const queue = [...passwords];
  page.on("dialog", (dialog) => {
    if (dialog.type() === "confirm") return dialog.accept();
    return dialog.accept(queue.length ? queue.shift() : "");
  });
}

test("no answer is in the page at all", async ({ page }) => {
  const errors = watchForErrors(page);
  for (const path of [VISION, JAM, OI]) {
    await page.goto(path, { waitUntil: "networkidle" });
    const html = await page.content();
    // Lines that only exist in a solution. If a page holds one, the password
    // is decoration.
    for (const giveaway of ["GAIN = 0.45", "self.seen.sort()", "self.above >= self.HOLD"]) {
      expect(html, `${path} contains an answer`).not.toContain(giveaway);
    }
    expect(await page.locator("#cz-answer-lock").count(), `${path} has no lock`).toBe(1);
  }
  await expectNoErrors(errors);
});

test("a wrong password does not open anything", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchForErrors(page);
  answerDialogs(page, ["wrong", "alsowrong", "stillwrong"]);
  await page.goto(VISION, { waitUntil: "networkidle" });

  const widget = page.locator(".cz-pyex").first();
  const before = await widget.locator(".cz-exercise__code").inputValue();
  await widget.locator('[data-action="solution"]').click();
  await page.waitForTimeout(3000);

  expect(await widget.locator(".cz-exercise__code").inputValue(),
    "a wrong password revealed the answer").toBe(before);
  await expect(widget.locator('[data-action="solution"]'),
    "the button did not come back for another try").toBeEnabled();
  await expectNoErrors(errors);
});

test.describe(() => {
  test.skip(!PASSWORD, "set CZ_ANSWER_PASSWORD to run the unlocking tests");

  test("the password opens the answer, and is remembered", async ({ page }) => {
    test.setTimeout(120_000);
    const errors = watchForErrors(page);
    answerDialogs(page, [PASSWORD]);

    await page.goto(VISION, { waitUntil: "networkidle" });
    const widget = page.locator(".cz-pyex").first();
    await widget.locator('[data-action="solution"]').click();
    await expect
      .poll(() => widget.locator(".cz-exercise__code").inputValue(), { timeout: 30_000 })
      .toContain("GAIN");

    // A second page must not ask again: one unlock per browser.
    let prompts = 0;
    page.on("dialog", (dialog) => { if (dialog.type() === "prompt") prompts += 1; });
    await page.goto(JAM, { waitUntil: "networkidle" });
    const next = page.locator(".cz-pyex").first();
    await next.locator('[data-action="solution"]').click();
    await expect
      .poll(() => next.locator(".cz-exercise__code").inputValue(), { timeout: 30_000 })
      .toContain("MARGIN");
    expect(prompts, "it asked for the password a second time").toBe(0);

    await expectNoErrors(errors);
  });

  test("the operator interface bindings unlock too", async ({ page }) => {
    test.setTimeout(120_000);
    const errors = watchForErrors(page);
    answerDialogs(page, [PASSWORD]);
    await page.goto(OI, { waitUntil: "networkidle" });

    const widget = page.locator(".cz-oi").first();
    const code = widget.locator("textarea").first();
    await widget.locator('[data-action="solution"]').click();
    await expect.poll(() => code.inputValue(), { timeout: 30_000 }).toContain("whenHeld");

    await expectNoErrors(errors);
  });
});
