/*
 * Ctrl-Z Wiki — autonomous planner core.
 *
 * The field layout, path maths, timeline builder, routine simulation and
 * Python export, with no DOM in sight. Split out from the widget so the
 * task can be checked headlessly: tools/validate-auto-task.js proves the
 * objective is reachable and that a naive straight line is not.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CZAuto = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------------- the task ---------------- */

  // Loading zone sits in our own alliance area, where the game pieces are.
  var LOAD = { x: 3.0, y: 6.2, w: 1.6, h: 1.6 };
  // The goal is across the field, and you shoot at it from range rather than
  // driving into it — a tighter range than teleop, because an auto has to be
  // repeatable rather than merely possible.
  var GOAL = { x: 16.4, y: 4.0 };
  var SHOT_RANGE = 3.0;
  // Two staggered walls: the only way through is under the first and over the
  // second, which is what makes the routine a route rather than a straight line.
  var BARRIERS = [
    { x: 7.0, y: 5.85, w: 1.0, h: 4.40, label: "A" },
    { x: 10.6, y: 2.10, w: 1.0, h: 4.20, label: "B" }
  ];

  // The start pose is part of the task, the same as a starting position in a
  // match. The user does not choose it.
  var START = { x: 1.0, y: 2.6, heading: 0 };

  var TARGET_SCORE = 2;
  var TIME_LIMIT = 15;
  var INTAKE_SECONDS = 0.5;
  var SPINUP_SECONDS = 1.0;
  var READY_SPEED = 0.9;
  var TRACE_HZ = 50;

  var ACTIONS = [
    { id: "intake", label: "Intake", seconds: 1.2, colour: "#f0932b" },
    { id: "spin_up_shooter", label: "Spin up", seconds: 1.0, colour: "#57a8ff" },
    { id: "shoot", label: "Shoot", seconds: 0.6, colour: "#4cc38a" },
    { id: "stow", label: "Stow", seconds: 0.5, colour: "#9b8cff" }
  ];

  function actionById(id) {
    for (var i = 0; i < ACTIONS.length; i++) if (ACTIONS[i].id === id) return ACTIONS[i];
    return ACTIONS[0];
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function deg2rad(d) { return (d * Math.PI) / 180; }
  function inZone(p, z) { return Math.abs(p.x - z.x) <= z.w / 2 && Math.abs(p.y - z.y) <= z.h / 2; }
  function rangeToGoal(p) { return Math.hypot(p.x - GOAL.x, p.y - GOAL.y); }
  function inShotRange(p) { return rangeToGoal(p) <= SHOT_RANGE; }

  /* Oriented robot rectangle against an axis-aligned barrier, by separating
   * axes. A circle would be easier but would fail paths that actually fit. */
  function robotHitsBox(pose, box, robot) {
    var c = Math.cos(pose.heading), s = Math.sin(pose.heading);
    var axes = [{ x: c, y: s }, { x: -s, y: c }, { x: 1, y: 0 }, { x: 0, y: 1 }];
    var hw = robot.length / 2, hh = robot.width / 2;
    var bx = box.w / 2, by = box.h / 2;
    var dx = box.x - pose.x, dy = box.y - pose.y;

    for (var i = 0; i < axes.length; i++) {
      var n = axes[i];
      var robotReach = hw * Math.abs(c * n.x + s * n.y) + hh * Math.abs(-s * n.x + c * n.y);
      var boxReach = bx * Math.abs(n.x) + by * Math.abs(n.y);
      if (Math.abs(dx * n.x + dy * n.y) > robotReach + boxReach) return false;
    }
    return true;
  }

  /* ---------------- geometry ---------------- */

  function catmullRom(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t;
    return {
      x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
    };
  }

  /* A Catmull-Rom spline passes through every waypoint, which is what people
   * expect when they drop a point on a field. PathPlanner uses Bezier control
   * handles, so its curves bulge differently — treat this as the intention. */
  function splinePoints(waypoints, perSegment) {
    if (waypoints.length < 2) return waypoints.slice();
    var pts = [waypoints[0]].concat(waypoints, [waypoints[waypoints.length - 1]]);
    var out = [];
    for (var i = 1; i < pts.length - 2; i++) {
      for (var s = 0; s < perSegment; s++) {
        out.push(catmullRom(pts[i - 1], pts[i], pts[i + 1], pts[i + 2], s / perSegment));
      }
    }
    out.push(waypoints[waypoints.length - 1]);
    return out;
  }

  function arcLengths(points) {
    var acc = [0];
    for (var i = 1; i < points.length; i++) {
      acc.push(acc[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
    }
    return acc;
  }

  function profileTime(length, maxV, maxA) {
    var ramp = (maxV * maxV) / (2 * maxA);
    if (2 * ramp >= length) return 2 * Math.sqrt(length / maxA);
    return (2 * maxV) / maxA + (length - 2 * ramp) / maxV;
  }

  function profileDistance(t, length, maxV, maxA) {
    var ramp = (maxV * maxV) / (2 * maxA);
    if (2 * ramp >= length) {
      var half = Math.sqrt(length / maxA);
      if (t <= half) return Math.min(length, 0.5 * maxA * t * t);
      var td = Math.min(t, 2 * half) - half;
      var peak = maxA * half;
      return Math.min(length, length / 2 + peak * td - 0.5 * maxA * td * td);
    }
    var tRamp = maxV / maxA;
    var tCruise = (length - 2 * ramp) / maxV;
    if (t <= tRamp) return 0.5 * maxA * t * t;
    if (t <= tRamp + tCruise) return ramp + (t - tRamp) * maxV;
    var tDown = Math.min(t, 2 * tRamp + tCruise) - tRamp - tCruise;
    return Math.min(length, ramp + tCruise * maxV + maxV * tDown - 0.5 * maxA * tDown * tDown);
  }

  function pointAt(points, lengths, distance) {
    var total = lengths[lengths.length - 1];
    var d = Math.max(0, Math.min(distance, total));
    for (var i = 1; i < lengths.length; i++) {
      if (lengths[i] >= d) {
        var span = lengths[i] - lengths[i - 1] || 1;
        var f = (d - lengths[i - 1]) / span;
        return {
          x: points[i - 1].x + (points[i].x - points[i - 1].x) * f,
          y: points[i - 1].y + (points[i].y - points[i - 1].y) * f
        };
      }
    }
    return points[points.length - 1];
  }

  function shortestTurn(from, to) {
    var diff = (to - from) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
  }

  /* ---------------- timeline ---------------- */

  function parallelOf(step) {
    if (!step.parallel) return [];
    return Array.isArray(step.parallel) ? step.parallel.slice() : [step.parallel];
  }

  function buildTimeline(routine, limits) {
    var entries = [];
    var pose = {
      x: routine.startPose.x,
      y: routine.startPose.y,
      heading: deg2rad(routine.startPose.heading)
    };
    var clock = 0;

    routine.steps.forEach(function (step, index) {
      var entry = {
        index: index,
        kind: step.kind,
        start: clock,
        from: { x: pose.x, y: pose.y, heading: pose.heading },
        parallel: parallelOf(step)
      };

      if (step.kind === "path" || step.kind === "driveTo") {
        var waypoints = step.kind === "path"
          ? [{ x: pose.x, y: pose.y }].concat(step.waypoints)
          : [{ x: pose.x, y: pose.y }, { x: step.pose.x, y: step.pose.y }];

        if (waypoints.length < 2) {
          entry.duration = 0;
          entry.points = waypoints;
          entry.lengths = [0];
          entry.length = 0;
        } else {
          var pts = splinePoints(waypoints, 14);
          var lens = arcLengths(pts);
          entry.points = pts;
          entry.lengths = lens;
          entry.length = lens[lens.length - 1];
          entry.duration = profileTime(entry.length, limits.maxV, limits.maxA);
        }
        // A drive-to-pose that cannot get there gives up on its timeout.
        if (step.kind === "driveTo" && step.timeout) entry.duration = Math.min(entry.duration, step.timeout);
        var heading = deg2rad(step.kind === "path" ? step.endHeading : step.pose.heading);
        pose = { x: waypoints[waypoints.length - 1].x, y: waypoints[waypoints.length - 1].y, heading: heading };
      } else if (step.kind === "action") {
        entry.duration = step.timeout || actionById(step.action).seconds;
        entry.parallel = [step.action];
      } else {
        entry.duration = step.seconds || 0;
      }

      entry.to = { x: pose.x, y: pose.y, heading: pose.heading };
      entry.end = clock + entry.duration;
      clock = entry.end;
      entries.push(entry);
    });

    return { entries: entries, duration: clock, limits: limits };
  }

  function entryAt(timeline, t) {
    var entries = timeline.entries;
    if (!entries.length) return null;
    for (var i = 0; i < entries.length; i++) {
      if (t >= entries[i].start && t <= entries[i].end) return entries[i];
    }
    return t < entries[0].start ? entries[0] : entries[entries.length - 1];
  }

  function poseAtTime(timeline, t) {
    var active = entryAt(timeline, t);
    if (!active) return null;
    var local = Math.max(0, Math.min(t - active.start, active.duration));
    var f = active.duration > 0 ? local / active.duration : 1;
    var heading = active.from.heading + shortestTurn(active.from.heading, active.to.heading) * f;

    if ((active.kind === "path" || active.kind === "driveTo") && active.points && active.points.length > 1) {
      var lim = timeline.limits;
      var d = profileDistance(local, active.length, lim.maxV, lim.maxA);
      var p = pointAt(active.points, active.lengths, d);
      return { x: p.x, y: p.y, heading: heading, entry: active };
    }
    return { x: active.to.x, y: active.to.y, heading: heading, entry: active };
  }

  /* ---------------- what the robot actually achieves ---------------- */

  function simulateRoutine(timeline, robot) {
    var dt = 1 / TRACE_HZ;
    var trace = [];
    var state = {
      // Autonomous starts with a piece already in the robot, same as a match.
      hasFuel: true, shooter: 0, score: 0,
      collided: false, collisionAt: null, collisionWith: null,
      intakeTimer: 0, events: [], misses: []
    };
    var firedIn = {};

    for (var t = 0; t <= timeline.duration + 1e-9; t += dt) {
      var pose = poseAtTime(timeline, t);
      if (!pose) break;
      var entry = pose.entry;
      var acting = entry ? entry.parallel : [];

      if (!state.collided) {
        for (var b = 0; b < BARRIERS.length; b++) {
          if (robotHitsBox(pose, BARRIERS[b], robot)) {
            state.collided = true;
            state.collisionAt = t;
            state.collisionWith = BARRIERS[b].label;
            break;
          }
        }
      }

      // Intake only works where the game pieces are.
      if (acting.indexOf("intake") !== -1 && !state.hasFuel && inZone(pose, LOAD)) {
        state.intakeTimer += dt;
        if (state.intakeTimer >= INTAKE_SECONDS) {
          state.hasFuel = true;
          state.intakeTimer = 0;
          state.events.push({ t: t, kind: "pickup" });
        }
      } else if (acting.indexOf("intake") === -1) {
        state.intakeTimer = 0;
      }

      var spinning = acting.indexOf("spin_up_shooter") !== -1;
      state.shooter += spinning ? dt / SPINUP_SECONDS : -dt / SPINUP_SECONDS * 1.5;
      state.shooter = Math.max(0, Math.min(1, state.shooter));

      // A shoot action fires once, at the instant it starts.
      if (entry && acting.indexOf("shoot") !== -1 && !firedIn[entry.index]) {
        firedIn[entry.index] = true;
        if (!state.hasFuel) state.misses.push({ t: t, why: "nothing loaded" });
        else if (state.shooter < READY_SPEED) state.misses.push({ t: t, why: "shooter only at " + Math.round(state.shooter * 100) + "%" });
        else if (!inShotRange(pose)) state.misses.push({ t: t, why: "out of range at " + rangeToGoal(pose).toFixed(1) + " m" });
        else {
          state.hasFuel = false;
          state.score++;
          state.events.push({ t: t, kind: "score" });
        }
      }

      trace.push({
        t: t,
        hasFuel: state.hasFuel,
        shooter: state.shooter,
        score: state.score,
        collided: state.collided,
        atLoad: inZone(pose, LOAD),
        inRange: inShotRange(pose),
        acting: acting
      });
    }

    state.trace = trace;
    return state;
  }

  function stateAtTime(result, t) {
    if (!result.trace.length) return null;
    var i = Math.min(result.trace.length - 1, Math.max(0, Math.round(t * TRACE_HZ)));
    return result.trace[i];
  }

  /* ---------------- Python, in autoroutines.py shape ---------------- */

  function toPython(routine, limits) {
    var lines = [];
    var pathIndex = 0;
    var comments = [];

    routine.steps.forEach(function (step) {
      if (step.kind !== "path") return;
      pathIndex++;
      comments.push("#   PATH_" + pathIndex + ": " +
        step.waypoints.map(function (w) { return "(" + w.x.toFixed(2) + ", " + w.y.toFixed(2) + ")"; }).join(" -> ") +
        "  ending at " + step.endHeading + " deg");
    });

    lines.push("# Autonomous routine sketched in the wiki planner.");
    lines.push("# Waypoints are blue-alliance field coordinates in metres.");
    if (comments.length) {
      lines.push("# Build these in PathPlanner and load them as named paths:");
      comments.forEach(function (c) { lines.push(c); });
    }
    lines.push("# Path constraints: " + limits.maxV.toFixed(1) + " m/s, " + limits.maxA.toFixed(1) + " m/s^2");
    lines.push("");
    lines.push("def " + (routine.name || "wiki_auto") + "(self):");
    lines.push("    return SequentialCommandGroup(");

    pathIndex = 0;
    routine.steps.forEach(function (step) {
      var alongside = parallelOf(step);

      if (step.kind === "path") {
        pathIndex++;
        var ref = "self.robot.PATH_" + pathIndex;
        if (alongside.length) {
          lines.push("        ParallelCommandGroup(");
          lines.push("            " + ref + ",");
          alongside.forEach(function (a) { lines.push("            self.robot.coroutines." + a + ","); });
          lines.push("        ),");
        } else {
          lines.push("        " + ref + ",");
        }
      } else if (step.kind === "driveTo") {
        var drive = "self.robot.coroutines.drive_to_pose(Pose2d(" +
          step.pose.x.toFixed(2) + ", " + step.pose.y.toFixed(2) +
          ", Rotation2d.fromDegrees(" + step.pose.heading + ")))" +
          (step.timeout ? ".withTimeout(" + step.timeout + ")" : "");
        if (alongside.length) {
          lines.push("        ParallelCommandGroup(");
          lines.push("            " + drive + ",");
          alongside.forEach(function (a) { lines.push("            self.robot.coroutines." + a + ","); });
          lines.push("        ),");
        } else {
          lines.push("        " + drive + ",");
        }
      } else if (step.kind === "action") {
        lines.push("        self.robot.coroutines." + step.action +
          (step.timeout ? ".withTimeout(" + step.timeout + ")," : ","));
      } else if (step.kind === "wait") {
        lines.push("        WaitCommand(" + (step.seconds || 0) + "),");
      }
    });

    lines.push("    )");
    return lines.join("\n");
  }


  return {
    LOAD: LOAD,
    START: START,
    GOAL: GOAL,
    SHOT_RANGE: SHOT_RANGE,
    rangeToGoal: rangeToGoal,
    inShotRange: inShotRange,
    BARRIERS: BARRIERS,
    ACTIONS: ACTIONS,
    TARGET_SCORE: TARGET_SCORE,
    TIME_LIMIT: TIME_LIMIT,
    INTAKE_SECONDS: INTAKE_SECONDS,
    READY_SPEED: READY_SPEED,
    actionById: actionById,
    inZone: inZone,
    robotHitsBox: robotHitsBox,
    parallelOf: parallelOf,
    buildTimeline: buildTimeline,
    poseAtTime: poseAtTime,
    entryAt: entryAt,
    simulateRoutine: simulateRoutine,
    stateAtTime: stateAtTime,
    toPython: toPython,
    deg2rad: deg2rad
  };
});
