#!/usr/bin/env node
/*
 * Check the second beginner tutorial: "Put the steps in order".
 *
 *   node tools/validate-sequence.js
 *
 * No dependencies.
 *
 * The widget shuffles the five step cards, and it refuses any shuffle that
 * would score if a student simply tapped along the row. It decides that from
 * the WORKING_ORDERS list in beginner.js, so the whole guarantee rests on that
 * list being right. This runs all 120 orders through the real robot and checks
 * that the list is still exactly the set that scores.
 *
 * The rules a step finishes by live inside a closure in beginner.js, so there
 * is no module to load and this file holds a copy of them. The first check
 * compares that copy with beginner.js and fails if the two have parted, which
 * is the signal to read the widget again and bring this file back in line.
 */
const fs = require("fs");
const path = require("path");
const CZScene = require("../assets/js/interactive/robot-scene.js");

const WIDGET = path.join(__dirname, "..", "assets", "js", "interactive", "beginner.js");
const source = fs.readFileSync(WIDGET, "utf8");

let failures = 0;
function check(ok, what) {
  console.log((ok ? "ok    " : "FAIL  ") + what);
  if (!ok) failures++;
}

/* ------------------------------------------------------------------ *
 * The copy of the widget's rules.
 * ------------------------------------------------------------------ */

const IDS = ["lower", "drive_piece", "intake", "drive_goal", "shoot"];
const DT = 1 / 60;              // the frame the widget draws at
const GIVE_UP_AFTER = 40;       // seconds; a routine that stalls never ends

function beginStep(world, id) {
  if (id === "lower") world.armDown = true;
  if (id === "drive_piece") world.targetX = CZScene.PIECE_AT;
  if (id === "intake") world.intakeOn = true;
  if (id === "drive_goal") world.targetX = CZScene.GOAL_AT;
  if (id === "shoot") CZScene.shoot(world);
  return { id: id, t: 0 };
}

function stepDone(world, state) {
  if (state.id === "lower") return world.armAngle > 0.98;
  if (state.id === "drive_piece") {
    var there = Math.abs(world.x - CZScene.PIECE_AT) < 0.004;
    if (!there) return false;
    if (world.intakeOn && world.pieceOnFloor && state.t < 3) return false;
    return true;
  }
  if (state.id === "drive_goal") return Math.abs(world.x - CZScene.GOAL_AT) < 0.004;
  if (state.id === "intake") return state.t > 0.8;
  if (state.id === "shoot") return state.t > 1.0;
  return true;
}

/* ------------------------------------------------------------------ *
 * Read what the widget says, so this file cannot drift away from it.
 * ------------------------------------------------------------------ */

/* The text of a top level `function name(...) {...}`, by counting braces. */
function functionSource(name) {
  const start = source.indexOf("function " + name + "(");
  if (start === -1) return null;
  let depth = 0;
  for (let i = source.indexOf("{", start); i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  return null;
}

/* Comments and layout are free to change. Anything else is a rule change. */
function logic(text) {
  return String(text)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* The widget reads `routine[index]` and keeps its own `running`. Compare the
 * part that decides what a step does to the world, which is the part copied. */
function conditions(text) {
  return logic(text).match(/if \(id === [\s\S]*?;/g) || [];
}

function readWorkingOrders() {
  const block = source.match(/var WORKING_ORDERS = \[([\s\S]*?)\];/);
  if (!block) return null;
  return (block[1].match(/"([^"]+)"/g) || []).map((s) => s.slice(1, -1));
}

function readSteps() {
  const block = source.match(/var STEPS = \[([\s\S]*?)\];/);
  if (!block) return null;
  return (block[1].match(/id: "([^"]+)"/g) || []).map((s) => s.slice(5, -1));
}

console.log("--- this file still matches the widget ---");

const widgetSteps = readSteps();
check(widgetSteps && widgetSteps.length === IDS.length &&
  IDS.every((id) => widgetSteps.indexOf(id) !== -1),
  "the five steps are the ones this file replays" +
  (widgetSteps ? "" : "\n      could not read STEPS out of beginner.js"));

const widgetBegin = functionSource("beginStep");
const mine = conditions(beginStep.toString()).map((s) => s.replace(/CZScene\./g, "window.CZScene."));
check(widgetBegin && conditions(widgetBegin).join("\n") === mine.join("\n"),
  "what each step does to the world matches beginStep() in beginner.js" +
  (widgetBegin ? "" : "\n      could not find beginStep() in beginner.js"));

const widgetDone = functionSource("stepDone");
check(widgetDone &&
  logic(widgetDone).replace(/window\.CZScene\./g, "CZScene.") ===
  logic(stepDone.toString()).replace(/function stepDone\(world, state\)/, "function stepDone(state)"),
  "when a step finishes matches stepDone() in beginner.js" +
  (widgetDone ? "" : "\n      could not find stepDone() in beginner.js"));

/* ------------------------------------------------------------------ *
 * Run every order the student can build.
 * ------------------------------------------------------------------ */

function run(order) {
  const world = CZScene.createWorld();
  let i = 0;
  let t = 0;
  let state = beginStep(world, order[0]);
  while (i < order.length && t < GIVE_UP_AFTER) {
    state.t += DT;
    t += DT;
    CZScene.step(world, DT);
    if (stepDone(world, state)) {
      i += 1;
      if (i < order.length) state = beginStep(world, order[i]);
    }
  }
  // The widget keeps drawing while a shot is in the air. Let it land.
  for (let k = 0; k < 120; k++) CZScene.step(world, DT);
  // The same two checks the widget grades on.
  return { scored: !world.pieceOnFloor && world.scored, stalled: t >= GIVE_UP_AFTER };
}

function orders(rest) {
  if (rest.length <= 1) return [rest];
  const out = [];
  rest.forEach((id, i) => {
    orders(rest.slice(0, i).concat(rest.slice(i + 1)))
      .forEach((tail) => out.push([id].concat(tail)));
  });
  return out;
}

console.log("--- which orders score ---");

const all = orders(IDS);
const scored = all.filter((o) => run(o).scored).map((o) => o.join(" "));
scored.forEach((o) => console.log("      " + o));

const listed = readWorkingOrders();
check(listed !== null, "beginner.js has a WORKING_ORDERS list");

if (listed) {
  const missing = scored.filter((o) => listed.indexOf(o) === -1);
  const extra = listed.filter((o) => scored.indexOf(o) === -1);
  check(missing.length === 0,
    "every order that scores is in WORKING_ORDERS" +
    (missing.length ? "\n      not listed: " + missing.join("\n                  ") : ""));
  check(extra.length === 0,
    "every order in WORKING_ORDERS scores" +
    (extra.length ? "\n      does not score: " + extra.join("\n                      ") : ""));
}

check(scored.length > 0, `${all.length} orders tried, ${scored.length} score`);

console.log("--- the shuffle cannot give the answer away ---");

/* This is the reason the list has to be exact. The widget shuffles until the
 * order is not in WORKING_ORDERS, so a wrong list is a bank that a student can
 * solve by tapping from left to right. */
check(widgetSteps !== null && scored.indexOf(widgetSteps.join(" ")) !== -1,
  "STEPS is written in an order that scores, so the bank must be shuffled");

const guard = functionSource("shuffledIds");
check(guard !== null && /while \(isWorkingOrder\(ids\)\)/.test(logic(guard)),
  "the shuffle throws away any order that scores");

const bank = functionSource("bankOrder");
check(bank !== null && /isWorkingOrder\(saved\)/.test(logic(bank)),
  "a saved shuffle that scores is thrown away too");

console.log(failures === 0
  ? "\nAll sequence checks passed."
  : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
