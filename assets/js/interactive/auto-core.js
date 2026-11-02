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
  var LOAD = { x: 4.4, y: 4.8, w: 1.6, h: 1.6 };
  // The goal is across the field, and you shoot at it from range rather than
  // driving into it — a tighter range than teleop, because an auto has to be
  // repeatable rather than merely possible.
  var GOAL = { x: 12.8, y: 4.0 };
  var SHOT_RANGE = 3.0;
  // Two staggered walls: the only way through is under the first and over the
  // second, which is what makes the routine a route rather than a straight line.
  var BARRIERS = [
    { x: 7.0, y: 6.025, w: 1.0, h: 4.05, label: "A" },
    { x: 10.6, y: 1.925, w: 1.0, h: 3.85, label: "B" }
  ];

  // The start pose is part of the task, the same as a starting position in a
  // match. The user does not choose it.
  var START = { x: 1.0, y: 2.6, heading: 0 };

  var TARGET_SCORE = 3;
  var TIME_LIMIT = 20;
  var INTAKE_SECONDS = 0.5;
  var SPINUP_SECONDS = 1.0;
  var READY_SPEED = 0.9;
  var TRACE_HZ = 50;
  var DRIVE_TO_SETTLE = 0.5;

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

  /* The planned speed along a path, the way PathPlanner plans one: never
   * faster than max speed, never speeding up or slowing down harder than max
   * acceleration, and slower in curves, so that turning needs no more than
   * max acceleration either (v² / r <= a). Samples every 5 cm. */
  var PROFILE_STEP = 0.05;

  function planProfile(points, lengths, maxV, maxA) {
    var total = lengths[lengths.length - 1];
    var n = Math.max(2, Math.ceil(total / PROFILE_STEP) + 1);
    var ds = total / (n - 1);
    var pts = [], s = [], v = [], t = [];
    for (var i = 0; i < n; i++) {
      s.push(i * ds);
      pts.push(pointAt(points, lengths, i * ds));
    }
    // How sharply the path bends at each sample, looking 15 cm either side.
    var reach = Math.max(1, Math.round(0.15 / ds));
    var limit = [];
    for (i = 0; i < n; i++) {
      var a = pts[Math.max(0, i - reach)], b = pts[i], c = pts[Math.min(n - 1, i + reach)];
      var h1 = Math.atan2(b.y - a.y, b.x - a.x), h2 = Math.atan2(c.y - b.y, c.x - b.x);
      // The turn happens between the middles of the two chords.
      var span = (Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(c.x - b.x, c.y - b.y)) / 2;
      var bend = span > 1e-6 ? Math.abs(shortestTurn(h1, h2)) / span : 0;
      limit.push(bend > 1e-6 ? Math.min(maxV, Math.sqrt(maxA / bend)) : maxV);
    }
    // Speed up from a standstill, then slow down to one, within max acceleration.
    for (i = 0; i < n; i++) v.push(i === 0 ? 0 : Math.min(limit[i], Math.sqrt(v[i - 1] * v[i - 1] + 2 * maxA * ds)));
    v[n - 1] = 0;
    for (i = n - 2; i >= 0; i--) v[i] = Math.min(v[i], Math.sqrt(v[i + 1] * v[i + 1] + 2 * maxA * ds));
    t.push(0);
    for (i = 1; i < n; i++) {
      var mean = (v[i - 1] + v[i]) / 2;
      t.push(t[i - 1] + (mean > 1e-6 ? ds / mean : Math.sqrt(2 * ds / maxA)));
    }
    return { points: pts, s: s, v: v, t: t, duration: t[n - 1], length: total };
  }

  /* Where the plan has the robot at time t into a path, and how fast it is
   * going there. */
  function sampleProfile(profile, local) {
    var t = profile.t, n = t.length;
    if (local <= 0) return { x: profile.points[0].x, y: profile.points[0].y, vx: 0, vy: 0, speed: 0 };
    if (local >= t[n - 1]) {
      var end = profile.points[n - 1];
      return { x: end.x, y: end.y, vx: 0, vy: 0, speed: 0 };
    }
    var lo = 0, hi = n - 1;
    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;
      if (t[mid] <= local) lo = mid; else hi = mid;
    }
    var f = (local - t[lo]) / (t[hi] - t[lo] || 1);
    var a = profile.points[lo], b = profile.points[hi];
    var speed = profile.v[lo] + (profile.v[hi] - profile.v[lo]) * f;
    // The direction of travel, from the samples either side, so it turns smoothly.
    var before = profile.points[Math.max(0, lo - 1)], after = profile.points[Math.min(n - 1, hi + 1)];
    var dx = after.x - before.x, dy = after.y - before.y, d = Math.hypot(dx, dy) || 1;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, vx: (dx / d) * speed, vy: (dy / d) * speed, speed: speed };
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
          if (step.kind === "path") {
            // The profile follows a finer copy of the curve, so it turns smoothly.
            var fine = splinePoints(waypoints, 60);
            entry.profile = planProfile(fine, arcLengths(fine), limits.maxV, limits.maxA);
            entry.duration = entry.profile.duration;
          } else {
            // A drive to a pose closes in on the target under feedback, which
            // takes a little longer than the straight-line plan.
            entry.duration = profileTime(entry.length, limits.maxV, limits.maxA) + DRIVE_TO_SETTLE;
          }
        }
        // A drive-to-pose that cannot get there gives up on its timeout.
        if (step.kind === "driveTo" && step.timeout) entry.duration = Math.min(entry.duration, step.timeout);
        if (step.kind === "driveTo") entry.target = { x: waypoints[waypoints.length - 1].x, y: waypoints[waypoints.length - 1].y };
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

    if (active.kind === "path" && active.profile) {
      var planned = sampleProfile(active.profile, local);
      return { x: planned.x, y: planned.y, heading: heading, entry: active, vx: planned.vx, vy: planned.vy, speed: planned.speed };
    }
    if (active.kind === "driveTo" && active.points && active.points.length > 1) {
      var lim = timeline.limits;
      var d = profileDistance(local, active.length, lim.maxV, lim.maxA);
      var p = pointAt(active.points, active.lengths, d);
      return { x: p.x, y: p.y, heading: heading, entry: active };
    }
    return { x: active.to.x, y: active.to.y, heading: heading, entry: active };
  }

  /* ---------------- the robot on real carpet ----------------
   *
   * The plan is what PathPlanner asks for. This is what a robot does with it,
   * modelled on maple-sim (github.com/Shenzhen-Robotics-Alliance/maple-sim):
   *
   *  - Drive motors: they top out at the robot's free speed, and have less and
   *    less acceleration to give as they get near it.
   *  - Grip: the carpet can only push the robot so hard. Speeding up, slowing
   *    down and turning all share that one budget. Ask for more and the
   *    wheels slip: the robot slides wide of the path, and the wheels turn
   *    more than the robot moves.
   *  - Odometry: the robot works out where it is by counting wheel turns. It
   *    can't tell a slipping wheel from a rolling one, so a slip moves the
   *    estimate somewhere the robot isn't.
   *  - Vision: a camera reading AprilTags corrects the estimate, the way
   *    WPILib's SwerveDrivePoseEstimator blends them. The farther the tag and
   *    the faster the robot, the noisier the reading.
   *  - The path follower steers by the estimate, like PathPlanner's: when the
   *    robot thinks it's off the path, it steers back, so an estimate that's
   *    wrong puts the real robot somewhere wrong.
   *
   * Each run draws its own carpet grip and camera noise from a seed, so a
   * routine can be run as many matches as you like, and run the same way
   * twice. */
  var PHYSICS = {
    hz: 100,
    topSpeed: 4.75,       // m/s: SWERVE_MAX_SPEED, the drive's free speed
    stallAccel: 12.0,     // m/s²: what the drive motors give from a standstill
    wheelCof: 0.9,        // Colson wheels on carpet, the figure maple-sim uses
    slideFraction: 0.85,  // a sliding wheel grips less than a rolling one
    gripSpread: 0.05,     // carpet, tread wear and the battery vary a little each match
    motorLag: 0.1,        // s: how quickly the drive motors reach a new speed
    followerP: 5.0,       // PathPlanner's default translation kP
    driveToP: 3.0,        // a drive to a pose: m/s per metre still to go
    stateStdDev: 0.1,     // m: how far the pose estimator trusts odometry (WPILib's default)
    odometryNoise: 0.01,  // wheel encoders are good to about 1% of the distance
    visionHz: 10,
    visionRange: 6.0,     // m: the farthest the camera reads a tag
    visionBase: 0.02,     // m of noise right next to a tag
    visionPerM2: 0.004,   // more noise with distance: this times the distance squared
    blurSpeed: 2.0,       // m/s at which motion blur doubles the noise
    visionReject: 0.2,    // m: a reading noisier than this is thrown away
    goalHalfWidth: 0.45,  // m: how far off-centre a shot can be and still go in
    rangeTolerance: 0.6,  // m: how wrong the distance can be before a shot lands short or long
    flightTime: 0.4       // s: a shot is in the air this long, carried along by the robot's own speed
  };
  var GRAVITY = 9.81;

  // AprilTags: on the alliance walls, and on the goal.
  var TAGS = [
    { x: 0.05, y: 1.5 }, { x: 0.05, y: 6.5 },
    { x: 17.5, y: 1.5 }, { x: 17.5, y: 6.5 },
    { x: GOAL.x - 0.45, y: GOAL.y - 0.3 }, { x: GOAL.x - 0.45, y: GOAL.y + 0.3 }
  ];

  /* A seeded random number generator (mulberry32), so a run repeats. */
  function randomFrom(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gaussian(rand) {
    return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  }

  /* How noisy a vision reading is from here at this speed, in metres, or
   * null if the camera can't read a tag. */
  function visionNoise(p, speed) {
    var nearest = Infinity;
    for (var i = 0; i < TAGS.length; i++) nearest = Math.min(nearest, Math.hypot(TAGS[i].x - p.x, TAGS[i].y - p.y));
    if (nearest > PHYSICS.visionRange) return null;
    var blur = 1 + (speed / PHYSICS.blurSpeed) * (speed / PHYSICS.blurSpeed);
    return (PHYSICS.visionBase + PHYSICS.visionPerM2 * nearest * nearest) * blur;
  }

  /* Where a shot lands, relative to the goal, when the robot aims from
   * where it thinks it is. A robot that's still moving carries the shot
   * along with it. */
  function shotFrom(truth, estimate, velocity) {
    var aim = Math.atan2(GOAL.y - estimate.y, GOAL.x - estimate.x);
    var ux = Math.cos(aim), uy = Math.sin(aim);
    var drift = { x: (velocity ? velocity.x : 0) * PHYSICS.flightTime, y: (velocity ? velocity.y : 0) * PHYSICS.flightTime };
    // Where it lands: thrown the distance the robot thinks the goal is, along
    // the aim, from where the robot really is, plus how far it's carried.
    var reach = rangeToGoal(estimate);
    var lx = truth.x + ux * reach + drift.x - GOAL.x, ly = truth.y + uy * reach + drift.y - GOAL.y;
    return { sideways: Math.abs(-uy * lx + ux * ly), lengthwise: ux * lx + uy * ly, carried: Math.hypot(drift.x, drift.y) };
  }

  /* Run the routine once.
   *   options.seed   which match: the carpet grip and camera noise it gets
   *   options.ideal  a perfect robot: it goes exactly where the plan says
   *   options.trace  false to skip recording each moment (faster) */
  function simulateRoutine(timeline, robot, options) {
    options = options || {};
    var P = PHYSICS;
    var ideal = Boolean(options.ideal);
    var recording = options.trace !== false;
    var rand = randomFrom(options.seed || 1);
    var dt = 1 / P.hz;
    var perTrace = Math.round(P.hz / TRACE_HZ);
    var perVision = Math.round(P.hz / P.visionHz);
    var grip = P.wheelCof * GRAVITY * (1 + P.gripSpread * gaussian(rand));
    var slideGrip = grip * P.slideFraction;
    var q = P.stateStdDev * P.stateStdDev;

    var first = timeline.entries.length ? timeline.entries[0].from : { x: 0, y: 0, heading: 0 };
    var truth = { x: first.x, y: first.y };
    var est = { x: first.x, y: first.y };
    var ground = { x: 0, y: 0 };   // how fast the robot really moves
    var wheels = { x: 0, y: 0 };   // how fast the wheels turn: what odometry counts
    var slipping = false;
    var lastCmd = { x: 0, y: 0 };
    var seeing = "none";            // what the camera last managed: "fix", "blurred" or "none"

    var trace = [];
    var state = {
      // Autonomous starts with a piece already in the robot, same as a match.
      hasFuel: true, shooter: 0, score: 0,
      collided: false, collisionAt: null, collisionWith: null, collisionPose: null,
      intakeTimer: 0, events: [], misses: [],
      grip: grip, slipSeconds: 0, slips: 0, slide: 0, worstError: 0, worstLag: 0, fixes: 0
    };
    var firedIn = {};
    var steps = Math.floor(timeline.duration * P.hz + 1e-6);

    for (var step = 0; step <= steps; step++) {
      var t = step * dt;
      var plan = poseAtTime(timeline, t);
      if (!plan) break;
      var entry = plan.entry;
      var acting = entry ? entry.parallel : [];
      var demand = 0;
      var fix = null;

      if (ideal) {
        truth = { x: plan.x, y: plan.y };
        est = { x: plan.x, y: plan.y };
        ground = { x: plan.vx || 0, y: plan.vy || 0 };
      } else {
        // What the follower asks the drivetrain for.
        var cmd = { x: 0, y: 0 };
        if (entry && entry.kind === "path" && entry.profile) {
          cmd.x = (plan.vx || 0) + P.followerP * (plan.x - est.x);
          cmd.y = (plan.vy || 0) + P.followerP * (plan.y - est.y);
        } else if (entry && entry.kind === "driveTo" && entry.target) {
          var want = { x: P.driveToP * (entry.target.x - est.x), y: P.driveToP * (entry.target.y - est.y) };
          var wantSpeed = Math.hypot(want.x, want.y);
          var cap = timeline.limits.maxV;
          if (wantSpeed > cap) { want.x *= cap / wantSpeed; want.y *= cap / wantSpeed; }
          // It speeds up and slows down within max acceleration, like a profiled controller.
          var stepX = want.x - lastCmd.x, stepY = want.y - lastCmd.y, stepLen = Math.hypot(stepX, stepY);
          var most = timeline.limits.maxA * dt;
          if (stepLen > most) { stepX *= most / stepLen; stepY *= most / stepLen; }
          cmd = { x: lastCmd.x + stepX, y: lastCmd.y + stepY };
        }
        var cmdSpeed = Math.hypot(cmd.x, cmd.y);
        if (cmdSpeed > P.topSpeed) { cmd.x *= P.topSpeed / cmdSpeed; cmd.y *= P.topSpeed / cmdSpeed; }
        lastCmd = cmd;

        // What the drive motors can do about it. Speeding up gets harder
        // near top speed; slowing down and turning don't.
        var ax = (cmd.x - wheels.x) / P.motorLag, ay = (cmd.y - wheels.y) / P.motorLag;
        var wheelSpeed = Math.hypot(wheels.x, wheels.y);
        if (wheelSpeed > 1e-6) {
          var ux = wheels.x / wheelSpeed, uy = wheels.y / wheelSpeed;
          var along = ax * ux + ay * uy;
          var acrossX = ax - along * ux, acrossY = ay - along * uy;
          var alongMost = P.stallAccel * Math.max(0.03, 1 - wheelSpeed / P.topSpeed);
          if (along > alongMost) along = alongMost;
          ax = along * ux + acrossX;
          ay = along * uy + acrossY;
        }
        var accel = Math.hypot(ax, ay);
        if (accel > P.stallAccel) { ax *= P.stallAccel / accel; ay *= P.stallAccel / accel; accel = P.stallAccel; }
        demand = accel;

        // What the carpet lets them do.
        if (!slipping && accel > grip) { slipping = true; state.slips++; }
        if (!slipping) {
          ground.x += ax * dt;
          ground.y += ay * dt;
          wheels.x = ground.x;
          wheels.y = ground.y;
        } else {
          // The wheels spin up regardless; friction drags the robot after them.
          wheels.x += ax * dt;
          wheels.y += ay * dt;
          var gapX = wheels.x - ground.x, gapY = wheels.y - ground.y, gap = Math.hypot(gapX, gapY);
          var pull = slideGrip * dt;
          if (gap <= pull) {
            ground.x = wheels.x; ground.y = wheels.y;
            slipping = false;
          } else {
            ground.x += (gapX / gap) * pull;
            ground.y += (gapY / gap) * pull;
          }
          state.slipSeconds += dt;
          // How much farther the wheels turned than the robot went: odometry's error.
          state.slide += Math.hypot(wheels.x - ground.x, wheels.y - ground.y) * dt;
        }

        truth.x += ground.x * dt;
        truth.y += ground.y * dt;

        // Odometry counts wheel turns, slipping or not.
        var moved = Math.hypot(wheels.x, wheels.y) * dt;
        est.x += wheels.x * dt + moved * P.odometryNoise * gaussian(rand);
        est.y += wheels.y * dt + moved * P.odometryNoise * gaussian(rand);

        // Vision, blended the way WPILib's pose estimator does it.
        if (step % perVision === 0) {
          var noise = visionNoise(truth, Math.hypot(ground.x, ground.y));
          seeing = noise === null ? "none" : noise <= P.visionReject ? "fix" : "blurred";
          if (seeing === "fix") {
            var seen = { x: truth.x + noise * gaussian(rand), y: truth.y + noise * gaussian(rand) };
            var r = noise * noise;
            var gain = q / (q + Math.sqrt(q * r));
            est.x += gain * (seen.x - est.x);
            est.y += gain * (seen.y - est.y);
            fix = { x: seen.x, y: seen.y, noise: noise };
            state.fixes++;
          }
        }
      }

      var pose = { x: truth.x, y: truth.y, heading: plan.heading };
      var error = Math.hypot(est.x - truth.x, est.y - truth.y);
      if (error > state.worstError) state.worstError = error;
      // How far behind (or off) the plan the robot really is, while it follows a path.
      if (entry && entry.kind === "path") {
        var lag = Math.hypot(plan.x - truth.x, plan.y - truth.y);
        if (lag > state.worstLag) state.worstLag = lag;
      }

      if (!state.collided) {
        for (var b = 0; b < BARRIERS.length; b++) {
          if (robotHitsBox(pose, BARRIERS[b], robot)) {
            state.collided = true;
            state.collisionAt = t;
            state.collisionWith = BARRIERS[b].label;
            state.collisionPose = { x: pose.x, y: pose.y, heading: pose.heading };
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

      // A shoot action fires once, at the instant it starts, aimed from
      // where the robot thinks it is.
      if (entry && acting.indexOf("shoot") !== -1 && !firedIn[entry.index]) {
        firedIn[entry.index] = true;
        var shot = shotFrom(truth, est, ground);
        if (!state.hasFuel) state.misses.push({ t: t, why: "nothing loaded", kind: "empty" });
        else if (state.shooter < READY_SPEED) state.misses.push({ t: t, why: "shooter only at " + Math.round(state.shooter * 100) + "%", kind: "shooter" });
        else if (!inShotRange(pose)) state.misses.push({ t: t, why: "out of range at " + rangeToGoal(pose).toFixed(1) + " m", kind: "range" });
        else if (shot.sideways > P.goalHalfWidth || Math.abs(shot.lengthwise) > P.rangeTolerance) {
          state.hasFuel = false;
          var how = shot.sideways > P.goalHalfWidth ? shot.sideways.toFixed(2) + " m wide" : Math.abs(shot.lengthwise).toFixed(2) + " m " + (shot.lengthwise > 0 ? "long" : "short");
          var moving = Math.hypot(ground.x, ground.y);
          state.misses.push({
            t: t, kind: shot.carried > error ? "moving" : "aim",
            why: shot.carried > error
              ? "shot while still moving at " + moving.toFixed(1) + " m/s, so it was carried " + how
              : "aimed from where the robot thought it was, " + error.toFixed(2) + " m from where it really was, so it went " + how
          });
        } else {
          state.hasFuel = false;
          state.score++;
          state.events.push({ t: t, kind: "score" });
        }
      }

      if (recording && step % perTrace === 0) {
        trace.push({
          t: t,
          x: truth.x, y: truth.y, heading: plan.heading,
          ex: est.x, ey: est.y,
          px: plan.x, py: plan.y,
          speed: Math.hypot(ground.x, ground.y),
          wheelSpeed: Math.hypot(wheels.x, wheels.y),
          planSpeed: plan.speed || 0,
          demand: demand,
          slipping: slipping,
          error: error,
          fix: fix,
          vision: ideal ? "fix" : seeing,
          hasFuel: state.hasFuel,
          shooter: state.shooter,
          score: state.score,
          collided: state.collided,
          atLoad: inZone(pose, LOAD),
          inRange: inShotRange(pose),
          acting: acting
        });
      }
    }

    state.trace = trace;
    state.picked = state.events.filter(function (e) { return e.kind === "pickup"; }).length;
    state.ok = !state.collided && state.score >= TARGET_SCORE && timeline.duration <= TIME_LIMIT;
    return state;
  }

  /* Run the routine as many matches, each with its own carpet and camera
   * noise, and count what goes wrong. */
  var MATCHES = 20;
  var MATCHES_NEEDED = 18;
  // Slipping that throws odometry off by less than this doesn't count.
  var SLIDE_NOTICED = 0.05;

  function reliability(timeline, robot, matches) {
    matches = matches || MATCHES;
    var out = {
      matches: matches, passed: 0, collided: 0, noPickup: 0, missedShots: 0, slipped: 0,
      hits: {}, missKinds: {}, slide: 0, worstLag: 0, worstError: 0, runs: []
    };
    for (var seed = 1; seed <= matches; seed++) {
      var r = simulateRoutine(timeline, robot, { seed: seed, trace: false });
      if (r.ok) out.passed++;
      if (r.collided) { out.collided++; out.hits[r.collisionWith] = (out.hits[r.collisionWith] || 0) + 1; }
      if (!r.picked) out.noPickup++;
      if (r.score < TARGET_SCORE) out.missedShots++;
      if (r.slide > SLIDE_NOTICED) out.slipped++;
      r.misses.forEach(function (m) { out.missKinds[m.kind] = (out.missKinds[m.kind] || 0) + 1; });
      out.slide += r.slide / matches;
      out.worstLag = Math.max(out.worstLag, r.worstLag);
      out.worstError = Math.max(out.worstError, r.worstError);
      out.runs.push({
        seed: seed, ok: r.ok, score: r.score, picked: r.picked, collided: r.collided ? r.collisionWith : null,
        slipSeconds: r.slipSeconds, slide: r.slide, worstError: r.worstError, worstLag: r.worstLag, misses: r.misses
      });
    }
    out.reliable = out.passed >= Math.ceil((MATCHES_NEEDED / MATCHES) * matches);
    return out;
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
    reliability: reliability,
    stateAtTime: stateAtTime,
    PHYSICS: PHYSICS,
    TAGS: TAGS,
    MATCHES: MATCHES,
    MATCHES_NEEDED: MATCHES_NEEDED,
    SLIDE_NOTICED: SLIDE_NOTICED,
    GRAVITY: GRAVITY,
    visionNoise: visionNoise,
    shotFrom: shotFrom,
    toPython: toPython,
    deg2rad: deg2rad
  };
});
