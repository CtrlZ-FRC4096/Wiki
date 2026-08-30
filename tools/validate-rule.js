#!/usr/bin/env node
/*
 * Check the third beginner tutorial: "Teach the robot to decide".
 *
 * Runs every rule a student can build — each sensor, both actions, every
 * slider position — and checks that the exercise is fair:
 *
 *   1. Each sensor that a game piece changes has at least one rule that works.
 *   2. The rules that work are one unbroken band, so a student who moves the
 *      slider one step at a time always gets warmer or colder, never both.
 *   3. Only "stop the indexer" can pass, and only the distance sensor or the
 *      indexer motor can pass.
 *   4. Every failing rule gives a reason, and no reason is empty.
 *
 * The comparison is not a choice. Each sensor carries the only one that can
 * make sense for it, so there is nothing to sweep there.
 *
 * Run:  node tools/validate-rule.js
 */

const CZRule = require("../assets/js/interactive/rule-core.js");

let failures = 0;
function check(ok, what) {
  console.log((ok ? "ok    " : "FAIL  ") + what);
  if (!ok) failures++;
}

function sweep(sensor, then) {
  const spec = CZRule.SENSORS[sensor];
  const rows = [];
  for (let v = spec.min; v <= spec.max; v += spec.step) {
    const out = CZRule.simulate({ sensor, then, value: v });
    rows.push({ value: v, passed: out.result.passed, result: out.result, run: out.run });
  }
  return rows;
}

function band(rows) {
  const hits = rows.filter((r) => r.passed).map((r) => r.value);
  return hits.length ? { lo: hits[0], hi: hits[hits.length - 1], count: hits.length } : null;
}

function contiguous(rows) {
  const hits = rows.filter((r) => r.passed).map((r) => r.value);
  if (hits.length < 2) return true;
  return hits[hits.length - 1] - hits[0] === hits.length - 1;
}

console.log("--- which rules work ---");

const good = {};
for (const sensor of Object.keys(CZRule.SENSORS)) {
  for (const then of ["stop", "start"]) {
    const rows = sweep(sensor, then);
    const b = band(rows);
    const key = `${sensor} ${then}`;
    if (b) {
      good[key] = b;
      console.log(`      ${key.padEnd(20)} works from ${b.lo} to ${b.hi} ` +
        `${CZRule.SENSORS[sensor].unit} (${b.count} of ${rows.length})`);
      check(contiguous(rows), `${key}: the working values are one unbroken band`);
    }
    if (then === "start") check(!b, `${key}: starting the indexer can never pass`);
    if (sensor === "battery") check(!b, `${key}: the battery voltage can never pass`);
  }
}

check(Boolean(good["intake stop"]), "the distance sensor has a rule that works");
check(Boolean(good["current stop"]), "the indexer motor has a rule that works");

// A band of one value is a guessing game, not an exercise.
for (const key of ["intake stop", "current stop"]) {
  if (good[key]) check(good[key].count >= 5, `${key}: at least five values work (${good[key].count})`);
}

/* The word beside the slider is the whole explanation a student gets, so it
 * has to match what the rule really does. The battery always reads 12.4 V, so
 * a made-up world cannot move it and it is not checked here. */
console.log("--- the words match the maths ---");
for (const [id, spec] of Object.entries(CZRule.SENSORS)) {
  if (id === "battery") continue;
  const mid = Math.round((spec.min + spec.max) / 2);
  const rule = { sensor: id, value: mid };
  const world = (reading) => ({ sensor: reading, current: reading });
  const under = CZRule.isTrue(world(mid - 1), rule);
  const over = CZRule.isTrue(world(mid + 1), rule);
  check(spec.word === "under" ? under && !over : over && !under,
    `${id}: "${spec.word} ${mid} ${spec.unit}" happens ${spec.word} ${mid} and not the other way`);
}

console.log("--- every failure explains itself ---");

let checked = 0;
let missing = [];
for (const sensor of Object.keys(CZRule.SENSORS)) {
  for (const then of ["stop", "start"]) {
    const spec = CZRule.SENSORS[sensor];
    for (let v = spec.min; v <= spec.max; v += spec.step) {
      const out = CZRule.simulate({ sensor, then, value: v });
      checked++;
      if (out.result.passed) continue;
      for (const c of out.result.checks) {
        if (!c.ok && !String(c.why).trim()) missing.push(`${sensor} ${then} ${v}: "${c.label}"`);
      }
      if (!String(out.result.summary).trim()) missing.push(`${sensor} ${then} ${v}: empty summary`);
    }
  }
}
check(missing.length === 0,
  `all ${checked} rules give a reason when they fail` +
  (missing.length ? `\n      first: ${missing[0]}` : ""));

console.log("--- the run always reaches the game piece ---");

const reach = CZRule.simulate({ sensor: "battery", then: "stop", value: 6 });
check(!reach.run.driving, "the robot finishes driving even when the rule never happens");

console.log(failures === 0 ? "\nAll rule checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
