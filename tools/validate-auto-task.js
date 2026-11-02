#!/usr/bin/env node
/*
 * Checks the autonomous planner task on the Planning an Auto page.
 *
 *   node tools/validate-auto-task.js
 *
 * No dependencies. Run it after moving a barrier, a zone, the time limit, or
 * any of the physics in auto-core.js. It proves the things the page depends on:
 *   - a well-planned route at moderate limits works in at least 18 of 20
 *     matches, inside the period, with time to spare
 *   - the same route with its actions in series does NOT fit, so bundling
 *     actions into the drives is genuinely what buys the time
 *   - a naive straight line hits a barrier
 *   - the limits are a balance: gentle limits run out of time, many moderate
 *     ones work, and pushing hard fails often enough that it doesn't pay
 */
const path = require("path");
const dir = path.join(__dirname, "..", "assets", "js", "interactive");
const A = require(path.join(dir, "auto-core.js"));
const F = require(path.join(dir, "field-sim.js"));

const MODERATE = { maxV: 4.0, maxA: 5.0 };
const GENTLE = { maxV: 3.0, maxA: 3.0 };
const PUSHED = [{ maxV: 5.0, maxA: 8.0 }, { maxV: 4.5, maxA: 10.0 }, { maxV: 6.5, maxA: 10.0 }];
// Under barrier A and over barrier B, with room to spare on both.
const LOW = 3.2, HIGH = 4.6;
const lx = A.LOAD.x, ly = A.LOAD.y;
const START = A.START;
// Fire from the near edge of the range ring rather than driving to the goal —
// using the range is most of what makes this fit in the period.
const STANDOFF = A.SHOT_RANGE * 0.98;
const fire = { x: A.GOAL.x - STANDOFF * 0.94, y: A.GOAL.y + STANDOFF * 0.34 };

/* Twenty matches of a routine at some limits, plus a perfect robot's run. */
function evaluate(routine, limits) {
  const tl = A.buildTimeline(routine, limits);
  const ideal = A.simulateRoutine(tl, F.ROBOT, { ideal: true, trace: false });
  const m = A.reliability(tl, F.ROBOT);
  return {
    seconds: +tl.duration.toFixed(2),
    passed: m.passed,
    hits: m.collided,
    missed: m.missedShots,
    noPickup: m.noPickup,
    slide: +m.slide.toFixed(2),
    idealHit: ideal.collided ? ideal.collisionWith : null,
    idealOk: ideal.ok,
    reliable: m.reliable && tl.duration <= A.TIME_LIMIT
  };
}

function slalom(parallel) {
  const along = (ids) => (parallel ? ids : []);
  const spin = parallel ? [] : [{ kind: "action", action: "spin_up_shooter", timeout: 1.0 }];
  return {
    name: "wiki_auto",
    startPose: { x: START.x, y: START.y, heading: START.heading },
    steps: [
      { kind: "path", waypoints: [{ x: 4.6, y: LOW }, { x: 8.0, y: LOW }, { x: 9.7, y: HIGH }, fire],
        endHeading: 0, parallel: along(["spin_up_shooter"]) },
      ...spin,
      { kind: "action", action: "shoot", timeout: 0.6 },
      { kind: "path", waypoints: [{ x: 9.7, y: HIGH }, { x: 8.0, y: LOW }, { x: 5.5, y: LOW }, { x: lx, y: ly }],
        endHeading: 0, parallel: along(["intake"]) },
      { kind: "action", action: "intake", timeout: 0.7 },
      { kind: "path", waypoints: [{ x: 5.5, y: LOW }, { x: 8.0, y: LOW }, { x: 9.7, y: HIGH }, fire],
        endHeading: 0, parallel: along(["spin_up_shooter"]) },
      ...spin,
      { kind: "action", action: "shoot", timeout: 0.6 }
    ]
  };
}

const naive = {
  name: "wiki_auto",
  startPose: { x: START.x, y: START.y, heading: START.heading },
  steps: [
    { kind: "path", waypoints: [fire], endHeading: 0, parallel: ["spin_up_shooter"] },
    { kind: "action", action: "shoot", timeout: 0.6 }
  ]
};

let problems = 0;
const check = (label, pass, detail) => {
  console.log((pass ? "  ok    " : "  FAIL  ") + label + (detail ? "  — " + detail : ""));
  if (!pass) problems++;
};

const route = slalom(true);
const par = evaluate(route, MODERATE);
const ser = evaluate(slalom(false), MODERATE);
const straight = evaluate(naive, MODERATE);
const gentle = evaluate(route, GENTLE);
const pushed = PUSHED.map((limits) => ({ limits, ...evaluate(route, limits) }));

// Every setting a student might try, from timid to flat out.
const grid = [];
for (const maxV of [2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.5]) {
  for (const maxA of [2, 3, 4, 5, 6, 7, 8, 10]) grid.push({ maxV, maxA, ...evaluate(route, { maxV, maxA }) });
}
const working = grid.filter((c) => c.reliable);
const moderateBox = grid.filter((c) => c.maxV >= 3.5 && c.maxV <= 5.0 && c.maxA >= 5 && c.maxA <= 7);
const fast = grid.filter((c) => c.seconds < 12.0);
const fastest = working.reduce((best, c) => (c.seconds < best.seconds ? c : best), working[0] || { seconds: Infinity });
const show = (c) => `${c.maxV} m/s, ${c.maxA} m/s²: ${c.seconds} s, ${c.passed}/20`;

console.log("Autonomous planner task\n");
check("a planned route at moderate limits works in 18 of 20 matches", par.reliable, JSON.stringify(par));
check("its path clears both barriers", !par.idealHit, par.idealHit ? "the plan itself hits " + par.idealHit : "");
check("it reloads at the loading zone", par.noPickup === 0, par.noPickup + " matches without a pickup");
check("it has slack for a rougher route", A.TIME_LIMIT - par.seconds >= 1.0,
  (A.TIME_LIMIT - par.seconds).toFixed(1) + " s of margin");
check("running actions in series misses the period", ser.seconds > A.TIME_LIMIT,
  ser.seconds + " s against a " + A.TIME_LIMIT + " s limit");
check("bundling actions into the drives is worth having",
  ser.seconds - par.seconds > 1.0, "saves " + (ser.seconds - par.seconds).toFixed(1) + " s");
check("a straight line hits a barrier", Boolean(straight.idealHit), "hits " + straight.idealHit);

console.log("\nThe balance\n");
check("gentle limits are safe but too slow", gentle.hits === 0 && gentle.missed === 0 && gentle.seconds > A.TIME_LIMIT,
  `${GENTLE.maxV} m/s, ${GENTLE.maxA} m/s²: ${gentle.seconds} s, no crashes or misses`);
check("most moderate limits work (the task is forgiving)",
  moderateBox.filter((c) => c.reliable).length >= Math.ceil(moderateBox.length * 0.6),
  moderateBox.filter((c) => c.reliable).length + " of " + moderateBox.length + " settings from 3.5–5 m/s and 5–7 m/s²");
pushed.forEach((p) => check(`pushing to ${p.limits.maxV} m/s, ${p.limits.maxA} m/s² is unreliable`, !p.reliable,
  `${p.seconds} s, works in ${p.passed}/20 (hit ${p.hits}, missed in ${p.missed}), slid ${p.slide} m a match`));
check("pushing makes the wheels slip far more", pushed.every((p) => p.slide > par.slide * 5),
  `moderate ${par.slide} m a match, pushed ${pushed.map((p) => p.slide).join(", ")} m`);
check("most plans under 12 s fail (fast is hard)",
  fast.filter((c) => c.reliable).length <= Math.floor(fast.length / 3),
  fast.filter((c) => c.reliable).length + " of " + fast.length + " work");
check("the fastest reliable setting saves less than 2.5 s over a moderate one",
  par.seconds - fastest.seconds < 2.5, "fastest that works: " + show(fastest));

console.log(`\nWorking settings: ${working.length} of ${grid.length}.`);
console.log(problems === 0 ? "The task is solvable and the lesson holds." : `\n${problems} problem(s) found.`);
process.exit(problems ? 1 : 0);
