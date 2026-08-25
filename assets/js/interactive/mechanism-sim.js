/*
 * Ctrl-Z Wiki — mechanism simulation engine.
 *
 * Three plants students tune on this wiki: a shooter flywheel (velocity
 * control), a pivoting arm and an elevator (both position control behind a
 * trapezoid motion profile — the same shape Motion Magic drives on our robot).
 *
 * Units match Phoenix 6, which is what our motors actually speak:
 *   flywheel   rotations per second, gains in volts per rps
 *   arm        degrees, gains in volts per degree (or per degree/sec)
 *   elevator   inches, gains in volts per inch (or per inch/sec)
 *
 * Each plant carries its own checks. A check runs one scenario, optionally
 * forcing some gains to zero, and compares one measured number against a
 * limit. Forcing feedback off is what makes the feedforward gains matter:
 * a big kP can paper over a wrong kV, and then nobody learns anything.
 *
 * The file runs unchanged in the browser and under Node, so the reference
 * tunings quoted on the wiki pages are verified by a script, not guessed.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CZSim = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VOLTS_MAX = 12;
  var CONTROL_DT = 0.02; // the roboRIO's 50 Hz loop
  var PHYSICS_DT = 0.001;

  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
  function sgn(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }

  /* ------------------------------------------------------------------ *
   * Trapezoid motion profile.
   *
   * Each tick: pick the fastest velocity we could still stop at the goal
   * from, then ramp towards it within the acceleration limit. Same shape as
   * WPILib's TrapezoidProfile.
   * ------------------------------------------------------------------ */
  function profileStep(state, goal, maxV, maxA, dt) {
    var dist = goal - state.pos;
    var dir = sgn(dist);
    var stoppable = Math.sqrt(Math.max(0, 2 * maxA * Math.abs(dist)));
    var target = dir * Math.min(maxV, stoppable);
    var vel = state.vel + clamp(target - state.vel, -maxA * dt, maxA * dt);
    var pos = state.pos + vel * dt;
    if (dir !== 0 && sgn(goal - pos) !== dir) { pos = goal; vel = 0; }
    return { pos: pos, vel: vel };
  }


  /* ------------------------------------------------------------------ *
   * Transmission model for the position mechanisms.
   *
   * A real arm is not one rigid lump. The motor and gearbox have their own
   * inertia, the structure between them and the payload flexes, and there is
   * slop in the chain. Modelling that as two masses joined by a spring with a
   * backlash deadband is what makes an over-cranked kP ring the way it does on
   * a real robot — and it is why kD exists.
   *
   * Everything is in the mechanism's own units (degrees or inches) and volts,
   * so the feedforward constants still mean what they say: the motor-side and
   * load-side kV add up to the kV you tune, and likewise for kA.
   * ------------------------------------------------------------------ */
  function stepTwoMass(plant, s, volts, dt, gravityAt) {
    var p = plant.plant;

    // Torque through the joint, in volt-equivalent units. Nothing is
    // transmitted at all while the slop is being taken up.
    var twist = s.xm - s.x;
    var lash = p.backlash / 2;
    var engaged = twist > lash ? twist - lash : (twist < -lash ? twist + lash : 0);
    var joint = 0;
    if (engaged !== 0) joint = p.kSpring * engaged + p.kJointDamp * (s.vm - s.v);

    // Motor side: fed by the amplifier, loaded by whatever the joint pulls back.
    s.vm += ((volts - p.kVmotor * s.vm - joint) / p.kAmotor) * dt;
    s.xm += s.vm * dt;

    // Load side: driven by the joint, fighting gravity and its own friction.
    var friction = Math.abs(s.v) < plant.stiction ? 0 : p.kS * sgn(s.v);
    s.v += ((joint - gravityAt(s.x) - friction - p.kVload * s.v) / p.kAload) * dt;
    s.x += s.v * dt;

    if (s.x <= plant.limits[0]) { s.x = plant.limits[0]; s.v = Math.max(0, s.v); }
    if (s.x >= plant.limits[1]) { s.x = plant.limits[1]; s.v = Math.min(0, s.v); }
    return s;
  }

  /* ------------------------------------------------------------------ *
   * Plants
   * ------------------------------------------------------------------ */
  var PLANTS = {};

  /* --- Shooter flywheel ---------------------------------------------- *
   * V = kS*sign(w) + kV*w + kA*dw/dt
   * kV = 0.24 V/rps puts free speed at 12/0.24 = 50 rps = 3000 RPM.
   * kA/kV = 0.83 s spin-up time constant, about right for a real wheel.
   * The velocity signal off a Talon is filtered and therefore late; that
   * lag is exactly what makes an over-cranked kP oscillate.
   */
  PLANTS.flywheel = {
    id: "flywheel",
    label: "Shooter flywheel",
    mode: "velocity",
    unit: "rps",
    plant: { kS: 0.10, kV: 0.24, kA: 0.20 },
    sensor: { delay: 2, quantum: 0.05 },
    gains: ["kV", "kP", "kI", "kD"],
    reference: { kV: 0.24, kP: 1.50, kI: 0.00, kD: 0.00 },
    sliders: {
      kV: { min: 0, max: 0.50, step: 0.01 },
      kP: { min: 0, max: 8.00, step: 0.25 },
      kI: { min: 0, max: 2.00, step: 0.10 },
      kD: { min: 0, max: 0.50, step: 0.01 }
    },
    modes: [
      { id: "full", label: "Full loop", scenario: "spinup", force: {},
        note: "All the gains operate. A ball touches the wheel at 5 s." },
      { id: "ff", label: "Tune kV", scenario: "spinup", force: { kP: 0, kI: 0, kD: 0 },
        note: "The feedback gains are 0. Only kV brings the wheel to the target speed." }
    ],
    range: [0, 50],
    setpoint: { min: 20, max: 45, step: 5, value: 40 },
    profile: null,
    start: 0,
    initial: function (start) { return { v: start || 0 }; },
    step: function (s, volts, dt) {
      var p = this.plant;
      if (Math.abs(s.v) < 0.05 && Math.abs(volts) < p.kS) return { v: 0 };
      var friction = Math.abs(s.v) < 0.05 ? 0 : p.kS * sgn(s.v);
      s.v += ((volts - friction - p.kV * s.v) / p.kA) * dt;
      return s;
    },
    output: function (s) { return s.v; },
    disturb: function (s) { s.v = Math.max(0, s.v - 9); return s; },
    scenarios: {
      spinup: function (sp) {
        return { start: 0, duration: 9, events: [
          { t: 0.0, goal: 0 },
          { t: 0.5, goal: sp },
          { t: 5.0, disturb: true },
          { t: 9.0, end: true }
        ] };
      }
    },
    checks: [
      {
        name: "Feedforward alone reaches the commanded speed",
        scenario: "spinup",
        force: { kP: 0, kI: 0, kD: 0 },
        metric: "settleError", limit: 1.2, window: "beforeDisturbance",
        hint: "With no feedback, kV alone sets the speed. kV is volts for each rotation per second. Calculate the volts that this wheel needs at the target."
      },
      {
        name: "Returns to speed within 1 second after the ball",
        scenario: "spinup", metric: "recoveryTime", limit: 1.0,
        hint: "Feedforward cannot detect the ball. Only feedback can. Increase kP."
      },
      {
        name: "Holds the target speed with no oscillation",
        scenario: "spinup", metric: "ripple", limit: 0.35,
        hint: "The wheel oscillates. kP is too high for the delay in the velocity signal. Decrease kP."
      },
      {
        name: "Does not go above the target speed",
        scenario: "spinup", metric: "overshoot", limit: 1.5,
        hint: "Overshoot on a flywheel is usually integral windup, or a kV that is too high. Keep kI at 0."
      }
    ]
  };

  /* --- Pivoting arm --------------------------------------------------- *
   * V = kG*cos(theta) + kS*sign(w) + kV*w + kA*dw/dt
   * kG is the voltage that holds the arm straight out sideways, where
   * gravity pulls hardest.
   */
  PLANTS.arm = {
    id: "arm",
    label: "Pivoting arm",
    mode: "position",
    unit: "\u00b0",
    /*
     * kVmotor + kVload is the kV you tune (0.05); kAmotor + kAload is kA.
     * kSpring puts the structural resonance near 10 Hz and backlash is a
     * little under a degree at the pivot, both typical of a chain-driven arm.
     */
    plant: {
      kG: 0.45, kS: 0.05,
      kVmotor: 0.040, kVload: 0.010,
      kAmotor: 0.002, kAload: 0.004,
      kSpring: 5.0, kJointDamp: 0.030, backlash: 0.4
    },
    stiction: 0.5,
    // A CANcoder on the pivot, read once per loop. Motion Magic closes the
    // loop on the Talon, so there is no extra lag to model on top of that.
    sensor: { delay: 0, quantum: 0.05 },
    fixed: { kA: 0.006 },
    gains: ["kG", "kV", "kP", "kD"],
    reference: { kG: 0.45, kV: 0.05, kP: 1.5, kD: 0.06 },
    sliders: {
      kG: { min: 0, max: 1.20, step: 0.05 },
      kV: { min: 0, max: 0.12, step: 0.005 },
      kP: { min: 0, max: 8.00, step: 0.25 },
      kD: { min: 0, max: 0.40, step: 0.01 }
    },
    modes: [
      { id: "full", label: "Full loop", scenario: "move", force: {},
        note: "All the gains operate. The arm moves to your target and back." },
      { id: "gravity", label: "Tune kG", scenario: "hold", force: { kV: 0, kP: 0, kD: 0 },
        note: "The arm holds 0\u00b0, the horizontal position. This is the angle of maximum gravity load. All the other gains are 0. Increase kG until the arm stops to move down. If kG is too high, the arm moves up." },
      { id: "ff", label: "Tune kV", scenario: "glide", force: { kP: 0, kD: 0 },
        note: "The feedback gains are 0 during a slow movement. Only kV keeps the arm on the dashed line." }
    ],
    range: [-90, 90],
    limits: [-90, 90],
    setpoint: { min: -90, max: 90, step: 15, value: 60 },
    profile: { maxV: 150, maxA: 300 },
    start: -75,
    initial: function (start) { return { x: start, v: 0, xm: start, vm: 0 }; },
    step: function (s, volts, dt) {
      var kG = this.plant.kG;
      return stepTwoMass(this, s, volts, dt, function (x) {
        return kG * Math.cos((x * Math.PI) / 180);
      });
    },
    output: function (s) { return s.x; },
    feedforwardGravity: function (posSetpoint) { return Math.cos((posSetpoint * Math.PI) / 180); },
    scenarios: {
      move: function (sp) {
        return { start: -75, duration: 8, events: [
          { t: 0.0, goal: -75 },
          { t: 0.5, goal: sp },
          { t: 4.0, goal: -30 },
          { t: 8.0, end: true }
        ] };
      },
      // Straight out sideways is where gravity pulls hardest.
      hold: function () {
        return { start: 0, duration: 3, events: [{ t: 0.0, goal: 0 }, { t: 3.0, end: true }] };
      },
      // A slow, short swing. Feedforward errors show up as drift off the
      // profile instead of piling up into a huge miss, so this is what the
      // feedback-off checks are judged on.
      glide: function () {
        return { start: -30, duration: 4, profile: { maxV: 60, maxA: 400 },
          events: [{ t: 0.0, goal: -30 }, { t: 0.5, goal: 30 }, { t: 4.0, end: true }] };
      }
    },
    checks: [
      {
        name: "Holds its position with no feedback",
        scenario: "hold", force: { kV: 0, kP: 0, kD: 0 },
        metric: "settleError", limit: 2.5,
        hint: "Only kG operates. If kG is too low, the arm moves down. If kG is too high, the arm moves up. Adjust kG until the arm holds its position."
      },
      {
        name: "Feedforward alone stops near the target",
        scenario: "glide", force: { kP: 0, kD: 0 },
        metric: "settleError", limit: 9,
        hint: "kV is volts for each degree per second. With the feedback gains at 0, kV controls the movement."
      },
      {
        name: "Feedforward alone follows the profile",
        scenario: "glide", force: { kP: 0, kD: 0 },
        metric: "trackError", limit: 8,
        hint: "The arm leaves the profile during the movement. kV is the voltage to hold a given speed. Too low and the arm is late. Too high and the arm is early."
      },
      {
        name: "Stops on the target and holds it",
        scenario: "move", metric: "settleError", limit: 0.25,
        hint: "Feedback corrects the remaining error. Increase kP."
      },
      {
        name: "Does not oscillate at the target",
        scenario: "move", metric: "ripple", limit: 0.3,
        hint: "The arm structure oscillates. Decrease kP, or add kD to damp it. But too much kD increases the encoder noise and the oscillation returns."
      },
      {
        name: "Overshoot is less than 1.3 degrees",
        scenario: "move", metric: "overshoot", limit: 1.3,
        hint: "Add kD to damp the movement. If the arm is in front of the profile, decrease kV."
      }
    ]
  };

  /* --- Elevator -------------------------------------------------------- *
   * V = kG + kS*sign(v) + kV*v + kA*dv/dt
   * Gravity pulls the same no matter where the carriage sits, so kG is a
   * constant rather than a cosine.
   */
  PLANTS.elevator = {
    id: "elevator",
    label: "Elevator",
    mode: "position",
    unit: "in",
    /*
     * Same two-mass idea as the arm: the rope or belt driving a cascade rig
     * stretches, and there is a little slop in the gearbox. That flex is what
     * puts a ceiling on kP.
     */
    plant: {
      kG: 0.60, kS: 0.08,
      kVmotor: 0.150, kVload: 0.030,
      kAmotor: 0.004, kAload: 0.006,
      kSpring: 7.0, kJointDamp: 0.045, backlash: 0.05
    },
    stiction: 0.2,
    sensor: { delay: 0, quantum: 0.02 },
    // kA comes from SysId, not from eyeballing a plot.
    // Three sliders only: kA comes from SysId, and this carriage is damped
    // enough by its own gearbox that kD changes nothing you can see. The arm
    // is where kD earns its keep.
    fixed: { kA: 0.010 },
    gains: ["kG", "kV", "kP"],
    reference: { kG: 0.60, kV: 0.18, kP: 2.0 },
    sliders: {
      kG: { min: 0, max: 1.50, step: 0.05 },
      kV: { min: 0, max: 0.40, step: 0.01 },
      kP: { min: 0, max: 10.00, step: 0.25 }
    },
    modes: [
      { id: "full", label: "Full loop", scenario: "move", force: {},
        note: "All the gains operate. The carriage moves to your target height and back down." },
      { id: "gravity", label: "Tune kG", scenario: "hold", force: { kV: 0, kP: 0 },
        note: "The carriage holds the center of its travel. All the other gains are 0. Increase kG until the carriage stops to move down. If kG is too high, it moves up." },
      { id: "ff", label: "Tune kV", scenario: "glide", force: { kP: 0 },
        note: "The feedback gains are 0 during a slow movement. Only kV keeps the carriage on the dashed line." }
    ],
    range: [0, 60],
    limits: [0, 60],
    setpoint: { min: 20, max: 55, step: 5, value: 45 },
    profile: { maxV: 45, maxA: 100 },
    start: 25,
    initial: function (start) { return { x: start, v: 0, xm: start, vm: 0 }; },
    step: function (s, volts, dt) {
      var kG = this.plant.kG;
      return stepTwoMass(this, s, volts, dt, function () { return kG; });
    },
    output: function (s) { return s.x; },
    feedforwardGravity: function () { return 1; },
    scenarios: {
      // Starts mid-travel, not parked on the bottom hard stop — a carriage
      // resting on its stop is held up by the stop, so kG errors are invisible.
      move: function (sp) {
        return { start: 25, duration: 8, events: [
          { t: 0.0, goal: 25 },
          { t: 0.5, goal: sp },
          { t: 4.0, goal: 12 },
          { t: 8.0, end: true }
        ] };
      },
      hold: function () {
        return { start: 30, duration: 3, events: [{ t: 0.0, goal: 30 }, { t: 3.0, end: true }] };
      },
      glide: function () {
        return { start: 15, duration: 4, profile: { maxV: 20, maxA: 150 },
          events: [{ t: 0.0, goal: 15 }, { t: 0.5, goal: 40 }, { t: 4.0, end: true }] };
      }
    },
    checks: [
      {
        name: "Holds its height with no feedback",
        scenario: "hold", force: { kV: 0, kP: 0 },
        metric: "settleError", limit: 1.0,
        hint: "Only kG operates. This is the voltage to hold the carriage against gravity. If kG is too low, the carriage moves down. If kG is too high, it moves up."
      },
      {
        name: "Feedforward alone stops near the target",
        scenario: "glide", force: { kP: 0 },
        metric: "settleError", limit: 2.5,
        hint: "kV is volts for each inch per second. With the feedback gains at 0, kV controls the movement."
      },
      {
        name: "Feedforward alone follows the profile",
        scenario: "glide", force: { kP: 0 },
        metric: "trackError", limit: 2.2,
        hint: "The carriage leaves the profile during the movement. kV is the voltage to hold a given speed. Too low and the carriage is late. Too high and it is early."
      },
      {
        name: "Stops at the target height and holds it",
        scenario: "move", metric: "settleError", limit: 0.25,
        hint: "Feedback corrects the remaining error. Increase kP."
      },
      {
        name: "Does not oscillate at the target",
        scenario: "move", metric: "ripple", limit: 0.3,
        hint: "The carriage oscillates on the elasticity of the rope. Decrease kP."
      },
      {
        name: "Overshoot is less than 0.6 inches",
        scenario: "move", metric: "overshoot", limit: 0.6,
        hint: "Increase kP to hold the carriage on the profile. Also make sure that kV is not too high."
      }
    ]
  };

  /* ------------------------------------------------------------------ *
   * One run of one scenario.
   * ------------------------------------------------------------------ */
  function Run(plantId, gains, setpoint, scenarioName) {
    var plant = PLANTS[plantId];
    this.plant = plant;
    this.gains = gains;
    this.setpoint = setpoint;
    this.scenarioName = scenarioName || Object.keys(plant.scenarios)[0];
    var scenario = plant.scenarios[this.scenarioName](setpoint);
    this.scenario = scenario;
    this.events = scenario.events;
    this.duration = scenario.duration;
    this.reset();
  }

  Run.prototype.reset = function () {
    var plant = this.plant;
    this.t = 0;
    this.state = plant.initial(this.scenario.start);
    this.goal = plant.mode === "position" ? this.scenario.start : 0;
    this.profileState = { pos: this.goal, vel: 0 };
    this.integral = 0;
    this.lastError = 0;
    this.volts = 0;
    this.eventIndex = 0;
    this.samples = [];
    this.disturbedAt = null;
    this.launchSpeed = 0;

    // Reading happens before this tick's physics, so every plant already has
    // one cycle of read-then-act delay; sensor.delay counts EXTRA cycles.
    var sensor = plant.sensor || { delay: 0, quantum: 0 };
    var resting = this.quantize(plant.output(this.state));
    this.sensorBuffer = [];
    for (var k = 0; k <= sensor.delay; k++) this.sensorBuffer.push(resting);
    this.lastMeasured = resting;
    this.measuredRate = 0;
  };

  Run.prototype.quantize = function (value) {
    var q = (this.plant.sensor || {}).quantum || 0;
    return q ? Math.round(value / q) * q : value;
  };

  Run.prototype.readSensor = function () {
    var sensor = this.plant.sensor || { delay: 0 };
    this.sensorBuffer.push(this.quantize(this.plant.output(this.state)));
    while (this.sensorBuffer.length > sensor.delay + 1) this.sensorBuffer.shift();
    var measured = this.sensorBuffer[0];
    // Velocity comes from differencing the encoder, same as a real loop —
    // which is exactly why a big kD amplifies sensor noise.
    this.measuredRate = (measured - this.lastMeasured) / CONTROL_DT;
    this.lastMeasured = measured;
    return measured;
  };

  Run.prototype.finished = function () { return this.t >= this.duration; };

  Run.prototype.tick = function () {
    var plant = this.plant;
    var g = this.gains;

    while (this.eventIndex < this.events.length && this.events[this.eventIndex].t <= this.t + 1e-9) {
      var ev = this.events[this.eventIndex++];
      if (ev.disturb && plant.disturb) {
        this.launchSpeed = plant.output(this.state);
        plant.disturb(this.state);
        this.disturbedAt = this.t;
      }
      if (typeof ev.goal === "number") this.goal = ev.goal;
    }

    var measured = this.readSensor();
    var posSetpoint, velSetpoint, error;

    if (plant.mode === "velocity") {
      velSetpoint = this.goal;
      error = velSetpoint - measured;
      this.integral = clamp(this.integral + error * CONTROL_DT, -50, 50);
      var dErr = (error - this.lastError) / CONTROL_DT;
      this.lastError = error;
      this.volts =
        (g.kV || 0) * velSetpoint +
        (g.kP || 0) * error +
        (g.kI || 0) * this.integral +
        (g.kD || 0) * dErr;
      posSetpoint = velSetpoint;
    } else {
      var previousVel = this.profileState.vel;
      var prof = this.scenario.profile || plant.profile;
      this.profileState = profileStep(this.profileState, this.goal, prof.maxV, prof.maxA, CONTROL_DT);
      posSetpoint = this.profileState.pos;
      velSetpoint = this.profileState.vel;
      var accelSetpoint = (velSetpoint - previousVel) / CONTROL_DT;
      error = posSetpoint - measured;
      this.volts =
        (g.kG || 0) * plant.feedforwardGravity(posSetpoint) +
        (g.kV || 0) * velSetpoint +
        (g.kA || 0) * accelSetpoint +
        (g.kP || 0) * error +
        (g.kD || 0) * (velSetpoint - this.measuredRate);
    }

    this.volts = clamp(this.volts, -VOLTS_MAX, VOLTS_MAX);

    var steps = Math.round(CONTROL_DT / PHYSICS_DT);
    for (var i = 0; i < steps; i++) plant.step(this.state, this.volts, PHYSICS_DT);

    this.samples.push({
      t: this.t,
      sp: posSetpoint,
      goal: this.goal,
      y: plant.output(this.state),
      measured: measured,
      volts: this.volts
    });
    this.t += CONTROL_DT;
    return this.samples[this.samples.length - 1];
  };

  function simulate(plantId, gains, setpoint, scenarioName) {
    var run = new Run(plantId, gains, setpoint, scenarioName);
    while (!run.finished()) run.tick();
    return run;
  }

  /* ------------------------------------------------------------------ *
   * Scoring. Same numbers whether a student presses the button or a
   * calibration script runs it headlessly.
   * ------------------------------------------------------------------ */
  function scoreRun(run, options) {
    options = options || {};
    var plant = run.plant;
    var samples = run.samples;
    var events = run.events;
    var HOLD = 0.8; // seconds at the end of a segment we expect to be settled

    var segments = [];
    for (var e = 0; e < events.length; e++) {
      if (typeof events[e].goal !== "number") continue;
      var until = run.duration;
      for (var n = e + 1; n < events.length; n++) {
        if (typeof events[n].goal === "number" || events[n].end) { until = events[n].t; break; }
      }
      segments.push({ from: events[e].t, to: until, goal: events[e].goal });
    }

    // A hold scenario has only the resting segment; score that one.
    var firstScored = segments.length > 1 ? 1 : 0;

    // "Before the disturbance" lets a feedforward-only check be judged on the
    // steady speed it reached, without the ball hit counting against it.
    var cutoff = Infinity;
    if (options.window === "beforeDisturbance") {
      for (var d = 0; d < events.length; d++) if (events[d].disturb) cutoff = events[d].t;
    }

    var settleError = 0, overshoot = 0, ripple = 0, trackError = 0;

    for (var i = firstScored; i < segments.length; i++) {
      var seg = segments[i];
      var prevGoal = i > 0 ? segments[i - 1].goal : run.scenario.start;
      var direction = seg.goal >= prevGoal ? 1 : -1;
      var to = Math.min(seg.to, cutoff === Infinity ? cutoff : cutoff - CONTROL_DT);
      if (to <= seg.from) continue;
      var holdFrom = Math.max(seg.from, to - HOLD);
      var hi = -Infinity, lo = Infinity;

      for (var j = 0; j < samples.length; j++) {
        var smp = samples[j];
        if (smp.t < seg.from - 1e-9 || smp.t > to + 1e-9) continue;
        if (plant.mode === "position" && smp.t < holdFrom) {
          trackError = Math.max(trackError, Math.abs(smp.sp - smp.y));
        }
        var past = direction * (smp.y - seg.goal);
        if (past > overshoot) overshoot = past;
        if (smp.t >= holdFrom) {
          settleError = Math.max(settleError, Math.abs(seg.goal - smp.y));
          if (smp.y > hi) hi = smp.y;
          if (smp.y < lo) lo = smp.y;
        }
      }
      if (hi > -Infinity) ripple = Math.max(ripple, hi - lo);
    }

    var metrics = { settleError: settleError, overshoot: overshoot, ripple: ripple };
    if (plant.mode === "position") metrics.trackError = trackError;

    if (plant.mode === "velocity") {
      var hit = null;
      for (var h = 0; h < events.length; h++) if (events[h].disturb) hit = events[h].t;
      metrics.recoveryTime = null;
      if (hit !== null) {
        for (var k = 0; k < samples.length; k++) {
          if (samples[k].t <= hit + CONTROL_DT) continue;
          if (Math.abs(run.setpoint - samples[k].y) <= 0.02 * run.setpoint) {
            metrics.recoveryTime = samples[k].t - hit;
            break;
          }
        }
      }
    }
    return metrics;
  }

  /* Run every check a plant defines against one set of student gains. */
  function runChecks(plantId, gains, setpoint) {
    var plant = PLANTS[plantId];
    return plant.checks.map(function (check) {
      var effective = {};
      if (plant.fixed) Object.keys(plant.fixed).forEach(function (k) { effective[k] = plant.fixed[k]; });
      plant.gains.forEach(function (k) { effective[k] = gains[k] || 0; });
      if (check.force) Object.keys(check.force).forEach(function (k) { effective[k] = check.force[k]; });

      var run = simulate(plantId, effective, setpoint, check.scenario);
      var metrics = scoreRun(run, { window: check.window });
      var value = metrics[check.metric];

      // A missing recovery time means it never got back to the setpoint.
      var passed = value !== null && value !== undefined && value <= check.limit;
      return {
        name: check.name,
        metric: check.metric,
        value: value,
        limit: check.limit,
        passed: passed,
        hint: check.hint
      };
    });
  }

  return {
    VOLTS_MAX: VOLTS_MAX,
    CONTROL_DT: CONTROL_DT,
    plants: PLANTS,
    Run: Run,
    simulate: simulate,
    scoreRun: scoreRun,
    runChecks: runChecks,
    clamp: clamp
  };
});
