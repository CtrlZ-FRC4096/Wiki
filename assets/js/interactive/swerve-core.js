/*
 * Ctrl-Z Wiki — swerve module angle maths.
 *
 * The same behaviour as optimize() and in_0_to_360_scope() in
 * robot/swerve/ctre_module_state.py, written in the shorter form the tutorial
 * teaches. tools/validate-swerve.js compares the two across a sweep of angles
 * and checks that the wheel ends up pushing the robot the same way.
 *
 * Angles are degrees. A module can drive in two directions, therefore it never
 * needs to turn more than 90 degrees to obey a command.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CZSwerve = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* The value equal to `angle` plus or minus whole turns that is closest to
   * `reference`. The result is always within 180 degrees of the reference. */
  function nearestEquivalent(reference, angle) {
    var difference = (((angle - reference + 180) % 360) + 360) % 360 - 180;
    return reference + difference;
  }

  /* Where the module should actually go, and how fast. If the command is more
   * than 90 degrees away, point the other way and drive backwards. */
  function optimize(currentAngle, targetAngle, speed) {
    var angle = nearestEquivalent(currentAngle, targetAngle);
    var reversed = false;
    if (Math.abs(angle - currentAngle) > 90) {
      angle = nearestEquivalent(currentAngle, angle + 180);
      speed = -speed;
      reversed = true;
    }
    return { angle: angle, speed: speed, reversed: reversed };
  }

  /* How far the module turns for a command, with and without the optimisation.
   * This is the number the tutorial is really about. */
  function compare(currentAngle, targetAngle, speed) {
    var naive = nearestEquivalent(currentAngle, targetAngle);
    var best = optimize(currentAngle, targetAngle, speed);
    return {
      naiveAngle: naive,
      naiveTurn: Math.abs(naive - currentAngle),
      optimizedAngle: best.angle,
      optimizedTurn: Math.abs(best.angle - currentAngle),
      speed: best.speed,
      reversed: best.reversed
    };
  }

  return {
    nearestEquivalent: nearestEquivalent,
    optimize: optimize,
    compare: compare
  };
});
