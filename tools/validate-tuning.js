#!/usr/bin/env node
/*
 * Checks the tuning simulators on the Controls pages.
 *
 *   node tools/validate-tuning.js
 *
 * No dependencies — it loads assets/js/interactive/mechanism-sim.js directly
 * and runs the same physics the browser runs.
 *
 * Run this after changing any plant, gain, or check limit. It verifies that:
 *   - the gains quoted on the wiki pages actually pass every check
 *   - they land on real slider positions, so a student can reach them
 *   - they pass at every setpoint the slider offers, not just the default
 *   - all-zero gains fail
 *   - every slider changes something, so there are no decorative knobs
 *   - each gain has a sensible band of acceptable values, rather than one
 *     magic number or the whole range
 */

const path = require("path");
const S = require(path.join(__dirname, "..", "assets", "js", "interactive", "mechanism-sim.js"));

let problems = 0;
const fail = (message) => { console.log("  FAIL  " + message); problems++; };
const ok = (message) => console.log("  ok    " + message);

const allPass = (id, gains, sp) => S.runChecks(id, gains, sp).every((c) => c.passed);
const failing = (id, gains, sp) => S.runChecks(id, gains, sp).filter((c) => !c.passed).map((c) => c.metric);

for (const id of Object.keys(S.plants)) {
  const plant = S.plants[id];
  const sp = plant.setpoint.value;
  console.log(`\n${plant.label} (${id})`);
  console.log(`  reference: ${JSON.stringify(plant.reference)}`);

  for (const gain of plant.gains) {
    const slider = plant.sliders[gain];
    const value = plant.reference[gain];
    const steps = (value - slider.min) / slider.step;
    if (value < slider.min || value > slider.max) {
      fail(`${gain}=${value} is outside its slider range ${slider.min}..${slider.max}`);
    } else if (Math.abs(steps - Math.round(steps)) > 1e-6) {
      fail(`${gain}=${value} is not on a slider step of ${slider.step}`);
    }
  }
  ok("reference gains are reachable on the sliders");

  const badSetpoints = [];
  for (let s = plant.setpoint.min; s <= plant.setpoint.max + 1e-9; s += plant.setpoint.step) {
    if (!allPass(id, plant.reference, s)) badSetpoints.push(`${s} (${failing(id, plant.reference, s)})`);
  }
  if (badSetpoints.length) fail(`reference fails at setpoint ${badSetpoints.join(", ")}`);
  else ok("reference passes at every setpoint");

  const zeros = Object.fromEntries(plant.gains.map((g) => [g, 0]));
  if (allPass(id, zeros, sp)) fail("all-zero gains pass — the checks are too loose to teach anything");
  else ok("all-zero gains fail");

  for (const gain of plant.gains) {
    const slider = plant.sliders[gain];
    const band = [];
    const stepCount = Math.round((slider.max - slider.min) / slider.step) + 1;
    for (let v = slider.min; v <= slider.max + 1e-9; v += slider.step) {
      if (allPass(id, { ...plant.reference, [gain]: +v.toFixed(6) }, sp)) band.push(+v.toFixed(6));
    }
    if (!band.length) {
      fail(`no value of ${gain} passes — check the limits on the checks that use it`);
    } else if (band.length === stepCount) {
      fail(`${gain} passes at every slider position — that slider does nothing`);
    } else {
      ok(`${gain} accepted between ${band[0]} and ${band[band.length - 1]} (${band.length} of ${stepCount} positions)`);
    }
  }
}

console.log(problems === 0 ? "\nAll tuning simulators check out." : `\n${problems} problem(s) found.`);
process.exit(problems ? 1 : 0);
