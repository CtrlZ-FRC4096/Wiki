/*
 * Ctrl-Z Wiki — the rule the third beginner tutorial builds.
 *
 * The widget draws the robot and the graph. This file holds the part that
 * decides: what each sensor reads, when the rule becomes true, and what the
 * result of a run means. It is separate so `tools/validate-rule.js` can run
 * every possible rule without a browser, and so the words a student reads
 * live next to the numbers they come from.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./robot-scene.js"));
  else root.CZRule = factory(root.CZScene);
})(typeof self !== "undefined" ? self : this, function (CZScene) {
  "use strict";

  /* The robot decides these, not the rule: they are where the indexer holds a
   * game piece and where the Jamomatic stops it. */
  var IN_AT = CZScene.IN_AT;
  var JAM_AT = CZScene.JAM_AT;

  /* Each sensor the student can choose. `read` takes the world and returns
   * what that sensor says. `min` and `max` are the ends of the slider.
   *
   * Each sensor also carries the only comparison that can make sense for it.
   * A distance gets smaller as the game piece arrives, so a distance rule
   * happens when the reading goes UNDER a value. A current gets larger, so a
   * current rule happens when it goes OVER one. The student does not choose
   * this: the sensor does. */
  var SENSORS = {
    intake: {
      label: "the distance sensor",
      unit: "cm",
      word: "under",
      op: "<",
      min: 2, max: CZScene.EMPTY, step: 1, start: 30,
      code: "self.intake_sensor.getDistance()",
      variable: "distance",
      read: function (world) { return world.sensor; }
    },
    current: {
      label: "the indexer motor",
      reads: "the current it pulls",
      unit: "A",
      word: "over",
      op: ">",
      min: 4, max: 50, step: 1, start: 12,
      code: "self.indexer_motor.get_stator_current().value",
      variable: "amps",
      read: function (world) { return world.current; }
    },
    battery: {
      label: "the battery voltage",
      unit: "V",
      word: "under",
      op: "<",
      min: 6, max: 13, step: 1, start: 11,
      code: "self.battery.getVoltage()",
      variable: "volts",
      read: function (world) { return 12.4; }
    }
  };

  /* A sensor that never changes when a game piece arrives cannot find one. */
  function sensorFindsPiece(sensor) { return sensor === "intake" || sensor === "current"; }

  function read(world, rule) { return SENSORS[rule.sensor].read(world); }

  function isTrue(world, rule) {
    var spec = SENSORS[rule.sensor];
    var value = read(world, rule);
    return spec.op === "<" ? value < rule.value : value > rule.value;
  }

  function unit(rule) { return SENSORS[rule.sensor].unit; }

  /* Say what a finished run means. `run` holds what happened:
   *   fired         the rule became true
   *   firedValue    what the chosen sensor said at that moment
   *   firedAt       how far away the piece was at that moment, in cm
   *   jammed        the intake pulled the piece in too far
   */
  function judge(rule, run) {
    var u = unit(rule);
    var seated = run.fired && run.firedAt <= IN_AT && run.firedAt > JAM_AT;
    var where = run.fired ? run.firedValue.toFixed(0) + " " + u : "";

    var checks = [
      {
        label: "The rule reads something a game piece changes",
        ok: sensorFindsPiece(rule.sensor),
        why: "The battery voltage stays at 12.4 V whatever the intake is doing. " +
          "A rule about it can never notice a game piece."
      },
      {
        label: "The game piece stopped inside the robot",
        ok: seated && !run.jammed,
        why: collectedWhy(rule, run, where)
      },
      {
        label: "The indexer stopped",
        ok: run.fired && !run.jammed && rule.then === "stop",
        why: stoppedWhy(rule, run)
      }
    ];

    return {
      passed: checks.every(function (c) { return c.ok; }),
      checks: checks,
      summary: summary(rule, run, where, seated)
    };
  }

  /* Which way to move the slider to make a rule happen sooner. A distance
   * rule happens sooner with a larger value, a current rule with a smaller
   * one, because the two readings move in opposite directions. */
  function nudge(rule, sooner) {
    var earlyIsBigger = SENSORS[rule.sensor].op === "<";
    return (sooner === (earlyIsBigger)) ? "Raise the value." : "Lower the value.";
  }

  function collectedWhy(rule, run, where) {
    if (run.jammed) {
      return rule.then === "start"
        ? "THEN is set to start the indexer, so the rule never stops it."
        : "The indexer ran until the game piece reached the Jamomatic. " +
          "The rule must happen sooner. " + nudge(rule, true);
    }
    if (!run.fired) return "The rule never happened, so the indexer never stopped.";
    return "The rule happened at " + where + ", before the game piece was inside " +
      "the robot. The rule must happen later. " + nudge(rule, false);
  }

  function stoppedWhy(rule, run) {
    if (rule.then === "start") return "THEN is set to start the indexer. Set it to stop the indexer.";
    if (!run.fired) {
      if (!sensorFindsPiece(rule.sensor)) return "Read the distance sensor or the indexer motor.";
      return "The rule never became true. Move the slider.";
    }
    return "";
  }

  function summary(rule, run, where, seated) {
    if (run.jammed) return "The game piece went all the way to the Jamomatic.";
    if (!run.fired) return "Nothing happened in six seconds.";
    if (seated) return "The indexer stopped at " + where + ", with the game piece inside.";
    return "The indexer stopped at " + where + ", too early.";
  }

  /* What the scale or the graph should say before a run, so the student can
   * see the answer is wrong without playing it first. */
  function hint(rule) {
    if (!sensorFindsPiece(rule.sensor)) {
      return "The battery voltage does not change when a game piece arrives.";
    }
    return "";
  }

  /* The rule in words, for the top of the builder. */
  function sentence(rule) {
    var spec = SENSORS[rule.sensor];
    return "If " + spec.label + " goes " + spec.word + " " + rule.value + " " +
      spec.unit + ", " + (rule.then === "stop" ? "stop" : "start") + " the indexer.";
  }

  /* ------------------------------------------------------------------ *
   * Run a rule with no browser. The widget runs the same steps one frame
   * at a time; this runs them all at once.
   * ------------------------------------------------------------------ */
  function simulate(rule, options) {
    options = options || {};
    var dt = options.dt || 1 / 60;
    var world = CZScene.createWorld({ intakeRate: options.intakeRate || 17 });
    world.targetX = CZScene.PIECE_AT;
    world.armDown = true;
    world.intakeOn = true;

    var run = { t: 0, driving: true, fired: false, firedValue: null, firedAt: null, jammed: false };

    while (run.t < 12) {
      if (run.driving) {
        if (CZScene.atPiece(world) && world.armAngle > 0.8) run.driving = false;
      } else {
        if (!run.fired && isTrue(world, rule)) {
          run.fired = true;
          run.firedValue = read(world, rule);
          run.firedAt = world.sensor;
          world.indexerOn = rule.then === "start";
        }
        if (world.indexerOn && world.sensor <= JAM_AT) run.jammed = true;
        if (run.jammed) break;
        if (run.fired && !world.indexerOn) break;
        if (run.t > 6) break;
      }
      run.t += dt;
      CZScene.step(world, dt);
    }
    return { run: run, world: world, result: judge(rule, run) };
  }

  return {
    IN_AT: IN_AT,
    JAM_AT: JAM_AT,
    SENSORS: SENSORS,
    sensorFindsPiece: sensorFindsPiece,
    read: read,
    isTrue: isTrue,
    unit: unit,
    judge: judge,
    hint: hint,
    sentence: sentence,
    simulate: simulate
  };
});
