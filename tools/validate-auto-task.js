#!/usr/bin/env node
/*
 * Checks the autonomous planner task on the Planning an Auto page.
 *
 *   node tools/validate-auto-task.js          (add --grid to see every setting)
 *
 * No dependencies. Run it after moving a barrier, a zone, the time limit, or
 * any of the physics in auto-core.js. It proves the things the page depends on:
 *   - two pieces is forgiving: a planned route works in at least 18 of 20
 *     matches at most sensible limits, with time to spare
 *   - running the actions in series costs real time
 *   - a naive straight line hits a barrier
 *   - pushing the limits too far fails, because the wheels slip and the robot
 *     falls behind
 *   - the stretch goal, a third piece, is possible, but only with no stops
 *     and the limits right at the top of the balance
 */
const path = require("path");
const dir = path.join(__dirname, "..", "assets", "js", "interactive");
const A = require(path.join(dir, "auto-core.js"));
const F = require(path.join(dir, "field-sim.js"));

const MODERATE = { maxV: 4.0, maxA: 5.0 };
const TOO_GENTLE = { maxV: 3.0, maxA: 2.0 };
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
    stretched: m.stretched,
    hits: m.collided,
    missed: m.missedShots,
    noPickup: m.noPickup,
    slide: +m.slide.toFixed(2),
    idealHit: ideal.collided ? ideal.collisionWith : null,
    reliable: m.reliable && tl.duration <= A.TIME_LIMIT,
    stretch: m.stretchReliable && tl.duration <= A.TIME_LIMIT
  };
}

/* Shoot the preload, then fetch more from the LOAD zone, one at a time.
 *   parallel  run the shooter and intake during the drives, not after them
 *   stops     wait in the LOAD zone to collect, rather than collecting on the
 *             way in and out */
function slalom(pieces, { parallel = true, stops = true } = {}) {
  const along = (ids) => (parallel ? ids : []);
  const spin = parallel ? [] : [{ kind: "action", action: "spin_up_shooter", timeout: 1.0 }];
  // Above barrier B already? Then the climb ends at the firing point.
  const climb = fire.x > 10.6 ? [{ x: 9.7, y: HIGH }] : [];
  const out = [{ x: 4.6, y: LOW }, { x: 8.0, y: LOW }, ...climb, fire];
  const back = [...climb, { x: 8.0, y: LOW }, { x: lx + 1.5, y: LOW }, { x: lx, y: ly }];
  const again = [{ x: lx + 1.5, y: LOW }, { x: 8.0, y: LOW }, ...climb, fire];
  const cycle = [
    { kind: "path", waypoints: back, endHeading: 0, parallel: along(["intake"]) },
    ...(stops ? [{ kind: "action", action: "intake", timeout: 0.7 }] : []),
    { kind: "path", waypoints: again, endHeading: 0,
      parallel: along(stops ? ["spin_up_shooter"] : ["intake", "spin_up_shooter"]) },
    ...spin,
    { kind: "action", action: "shoot", timeout: 0.6 }
  ];
  const steps = [
    { kind: "path", waypoints: out, endHeading: 0, parallel: along(["spin_up_shooter"]) },
    ...spin,
    { kind: "action", action: "shoot", timeout: 0.6 }
  ];
  for (let i = 1; i < pieces; i++) steps.push(...cycle);
  return { name: "wiki_auto", startPose: { x: START.x, y: START.y, heading: START.heading }, steps };
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

const two = slalom(A.TARGET_SCORE);
const three = slalom(A.STRETCH_SCORE, { stops: false });
const threeWithStops = slalom(A.STRETCH_SCORE);

const par = evaluate(two, MODERATE);
const ser = evaluate(slalom(A.TARGET_SCORE, { parallel: false }), MODERATE);
const straight = evaluate(naive, MODERATE);
const gentle = evaluate(two, TOO_GENTLE);
const pushed = PUSHED.map((limits) => ({ limits, ...evaluate(two, limits) }));

// Every setting a student might try, from timid to flat out.
const grid = [];
for (const maxV of [2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.5]) {
  for (const maxA of [2, 3, 4, 5, 6, 7, 8, 10]) {
    const limits = { maxV, maxA };
    grid.push({ maxV, maxA, ...evaluate(two, limits), three: evaluate(three, limits) });
  }
}
const sensible = grid.filter((c) => c.maxV >= 3.0 && c.maxV <= 5.0 && c.maxA >= 3 && c.maxA <= 6);
const stretchers = grid.filter((c) => c.three.stretch);
const best = stretchers.reduce((b, c) => (!b || c.three.seconds < b.three.seconds ? c : b), null);
const threeModerate = evaluate(three, MODERATE);

console.log("Autonomous planner task\n");
check(`a planned route scores ${A.TARGET_SCORE} at moderate limits in 18 of 20 matches`, par.reliable, JSON.stringify(par));
check("its path clears both barriers", !par.idealHit, par.idealHit ? "the plan itself hits " + par.idealHit : "");
check("it reloads at the loading zone", par.noPickup === 0, par.noPickup + " matches without a pickup");
check("running the actions in series costs real time", ser.seconds - par.seconds > 1.0,
  "costs " + (ser.seconds - par.seconds).toFixed(1) + " s");
check("a straight line hits a barrier", Boolean(straight.idealHit), "hits " + straight.idealHit);

console.log(`\n${A.TARGET_SCORE} pieces: forgiving, but not without limit\n`);
check("most sensible limits work",
  sensible.filter((c) => c.reliable).length >= Math.ceil(sensible.length * 0.8),
  sensible.filter((c) => c.reliable).length + " of " + sensible.length + " settings from 3–5 m/s and 3–6 m/s²");
check("very gentle limits run out of time", gentle.seconds > A.TIME_LIMIT && gentle.hits === 0,
  `${TOO_GENTLE.maxV} m/s, ${TOO_GENTLE.maxA} m/s²: ${gentle.seconds} s`);
pushed.forEach((p) => check(`pushing to ${p.limits.maxV} m/s, ${p.limits.maxA} m/s² is unreliable`, !p.reliable,
  `${p.seconds} s, works in ${p.passed}/20 (hit ${p.hits}, missed in ${p.missed}), slid ${p.slide} m a match`));
check("pushing makes the wheels slip far more", pushed.every((p) => p.slide > par.slide * 5),
  `moderate ${par.slide} m a match, pushed ${pushed.map((p) => p.slide).join(", ")} m`);

console.log(`\nThe stretch goal: ${A.STRETCH_SCORE} pieces\n`);
check("it can be done", Boolean(best),
  best ? `with no stops, at ${best.maxV} m/s, ${best.maxA} m/s²: ${best.three.seconds} s, ${best.three.stretched}/20` : "no setting works");
check("not at moderate limits", !threeModerate.stretch,
  `${MODERATE.maxV} m/s, ${MODERATE.maxA} m/s²: ${threeModerate.seconds} s`);
if (best) {
  const stopping = evaluate(threeWithStops, { maxV: best.maxV, maxA: best.maxA });
  check("not with stops to collect, even at the best limits", !stopping.stretch,
    `${stopping.seconds} s with stops`);
}
check("only a few settings do it (it is a stretch)",
  stretchers.length > 0 && stretchers.length <= Math.ceil(grid.length * 0.15),
  stretchers.length + " of " + grid.length + ": " + stretchers.map((c) => `${c.maxV}/${c.maxA}`).join(", "));

console.log(`\nSettings that score ${A.TARGET_SCORE}: ${grid.filter((c) => c.reliable).length} of ${grid.length}.`);
if (process.argv.includes("--grid")) {
  const Vs = [...new Set(grid.map((c) => c.maxV))], As = [...new Set(grid.map((c) => c.maxA))];
  const table = (label, cell) => {
    console.log(`\n${label}: seconds and matches that work, by max acceleration (rows) and max speed (columns)`);
    console.log("      " + Vs.map((v) => String(v).padStart(11)).join(""));
    As.forEach((a) => console.log(String(a).padStart(6) + Vs.map((v) => {
      const [seconds, works] = cell(grid.find((g) => g.maxV === v && g.maxA === a));
      return `${seconds.toFixed(1)}s ${String(works).padStart(2)}`.padStart(11);
    }).join("")));
  };
  table(`${A.TARGET_SCORE} pieces`, (c) => [c.seconds, c.passed]);
  table(`${A.STRETCH_SCORE} pieces, no stops`, (c) => [c.three.seconds, c.three.stretched]);
}
console.log(problems === 0 ? "The task is solvable and the lesson holds." : `\n${problems} problem(s) found.`);
process.exit(problems ? 1 : 0);
