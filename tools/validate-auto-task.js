#!/usr/bin/env node
/*
 * Checks the autonomous planner task on the Planning an Auto page.
 *
 *   node tools/validate-auto-task.js
 *
 * No dependencies. Run it after moving a barrier, a zone, or the time limit.
 * It proves three things the page depends on:
 *   - a well-planned route finishes the objective inside the period
 *   - the same route with its actions in series does NOT, so bundling actions
 *     into the drives is genuinely what buys the time
 *   - a naive straight line hits a barrier
 */
const path = require("path");
const dir = path.join(__dirname, "..", "assets", "js", "interactive");
const A = require(path.join(dir, "auto-core.js"));
const F = require(path.join(dir, "field-sim.js"));

const LIMITS = { maxV: 4.5, maxA: 4.5 };
const LOW = 3.0, HIGH = 4.8;
const lx = A.LOAD.x, ly = A.LOAD.y;
const START = A.START;
// Fire from the near edge of the range ring rather than driving to the goal —
// using the range is most of what makes this fit in the period.
const STANDOFF = A.SHOT_RANGE * 0.98;
const fire = { x: A.GOAL.x - STANDOFF * 0.94, y: A.GOAL.y + STANDOFF * 0.34 };

function evaluate(routine) {
  const tl = A.buildTimeline(routine, LIMITS);
  const r = A.simulateRoutine(tl, F.ROBOT);
  return {
    seconds: +tl.duration.toFixed(2),
    hit: r.collided ? r.collisionWith : null,
    picked: r.events.filter((e) => e.kind === "pickup").length,
    score: r.score,
    ok: !r.collided && r.score >= A.TARGET_SCORE && tl.duration <= A.TIME_LIMIT
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

const par = evaluate(slalom(true));
const ser = evaluate(slalom(false));
const straight = evaluate(naive);

console.log("Autonomous planner task\n");
check("a planned route completes the objective", par.ok, JSON.stringify(par));
check("it clears both barriers", !par.hit, par.hit ? "hits " + par.hit : "");
check("it reloads at the loading zone", par.picked >= 1, "picked up " + par.picked);
check("running actions in series misses the period", !ser.ok && !ser.hit,
  ser.seconds + " s against a " + A.TIME_LIMIT + " s limit");
check("bundling actions into the drives is worth having",
  ser.seconds - par.seconds > 1.0, "saves " + (ser.seconds - par.seconds).toFixed(1) + " s");
check("a straight line hits a barrier", Boolean(straight.hit), "hits " + straight.hit);
check("the objective has slack for a rougher route",
  A.TIME_LIMIT - par.seconds >= 1.0, (A.TIME_LIMIT - par.seconds).toFixed(1) + " s of margin");

console.log(problems === 0 ? "\nThe task is solvable and the lesson holds." : `\n${problems} problem(s) found.`);
process.exit(problems ? 1 : 0);
