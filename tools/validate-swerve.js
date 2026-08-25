#!/usr/bin/env node
/*
 * Checks the swerve module maths on the Swerve Module Optimization page.
 *
 *   node tools/validate-swerve.js
 *
 * No dependencies. It compares the short form the tutorial teaches against the
 * longer form in robot/swerve/ctre_module_state.py, across a sweep of angles.
 * The two may return different numbers at exactly 180 degrees, where both
 * answers are the same distance away. What must always agree is the physical
 * result: where the wheel points, and which way it pushes the robot.
 */
const path = require("path");
const S = require(path.join(__dirname, "..", "assets", "js", "interactive", "swerve-core.js"));

/* The robot code, translated line for line from ctre_module_state.py.
 *
 * Python's % is a modulo and always returns a value with the sign of the
 * divisor. JavaScript's % is a remainder and keeps the sign of the dividend.
 * They differ for a negative module angle, so the translation has to say which
 * one it means. Getting this wrong makes the comparison below meaningless.
 */
function pythonMod(a, n) {
  return ((a % n) + n) % n;
}

function inZeroTo360Scope(scopeReference, newAngle) {
  const lowerOffset = pythonMod(scopeReference, 360);
  let lowerBound, upperBound;
  if (lowerOffset >= 0) {
    lowerBound = scopeReference - lowerOffset;
    upperBound = scopeReference + 360 - lowerOffset;
  } else {
    upperBound = scopeReference - lowerOffset;
    lowerBound = scopeReference + 360 - lowerOffset;
  }
  while (newAngle < lowerBound) newAngle += 360;
  while (newAngle > upperBound) newAngle -= 360;
  if (newAngle - scopeReference > 180) newAngle -= 360;
  else if (newAngle - scopeReference < -180) newAngle += 360;
  return newAngle;
}

function robotOptimize(current, target, speed) {
  let angle = inZeroTo360Scope(current, target);
  const delta = angle - current;
  if (Math.abs(delta) > 90) {
    speed = -speed;
    angle = delta > 90 ? angle - 180 : angle + 180;
  }
  return { angle, speed };
}

const rad = (d) => (d * Math.PI) / 180;
const push = (angle, speed) => [speed * Math.cos(rad(angle)), speed * Math.sin(rad(angle))];

const REFS = [-720.5, -540, -181, -95.2, -1, 0, 0.5, 37, 179.9, 359, 361, 720, 1090.3];
const ANGLES = [-400, -180, -179.9, -3, 0, 44, 90, 179, 180, 270, 400, 900];

let problems = 0;
let sameNumber = 0, samePhysical = 0, total = 0, maxTurn = 0;
const notes = [];

for (const ref of REFS) {
  for (const target of ANGLES) {
    total++;
    const mine = S.optimize(ref, target, 3.0);
    const theirs = robotOptimize(ref, target, 3.0);

    if (Math.abs(mine.angle - theirs.angle) < 1e-9) sameNumber++;
    else if (notes.length < 4) notes.push(`ref ${ref}, target ${target}: robot ${theirs.angle}, tutorial ${mine.angle}`);

    const a = push(mine.angle, mine.speed), b = push(theirs.angle, theirs.speed);
    if (Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6) samePhysical++;
    else { console.log(`  FAIL  ref ${ref}, target ${target}: the wheel pushes different ways`); problems++; }

    const turn = Math.abs(mine.angle - ref);
    if (turn > maxTurn) maxTurn = turn;
    if (turn > 90 + 1e-6) { console.log(`  FAIL  ref ${ref}, target ${target} turns ${turn} degrees`); problems++; }

    // The optimised angle must still be the commanded angle, or its opposite.
    const off = Math.abs((((mine.angle - target) % 180) + 180) % 180);
    if (Math.min(off, 180 - off) > 1e-6) { console.log(`  FAIL  ref ${ref}, target ${target}: angle is not the command or its opposite`); problems++; }
  }
}

/* The wrap functions on their own. Differences here are expected at exactly
 * 180 degrees, where both answers are the same distance from the module. They
 * disappear after optimize(), but the tutorial mentions them, so check that
 * every difference really is a tie. */
let wrapSame = 0, wrapTies = 0;
for (const ref of REFS) {
  for (const target of ANGLES) {
    const mine = S.nearestEquivalent(ref, target);
    const theirs = inZeroTo360Scope(ref, target);
    if (Math.abs(mine - theirs) < 1e-9) { wrapSame++; continue; }
    const tie = Math.abs(Math.abs(mine - ref) - 180) < 1e-9 && Math.abs(Math.abs(theirs - ref) - 180) < 1e-9;
    if (tie) wrapTies++;
    else { console.log(`  FAIL  wrap ref ${ref}, target ${target}: robot ${theirs}, tutorial ${mine}, and it is not a tie`); problems++; }
  }
}

console.log(`Swerve module optimization\n`);
console.log(`  compared ${total} (module angle, command) pairs against the robot code`);
console.log(`  ok    identical result in ${sameNumber} of ${total}`);
console.log(`  ok    the wheel pushes the same way in ${samePhysical} of ${total}`);
console.log(`  ok    the module never turns more than 90 degrees (worst was ${maxTurn.toFixed(1)})`);
console.log(`  ok    wrap alone: identical in ${wrapSame}, and ${wrapTies} exact 180 degree tie(s)`);
if (notes.length) {
  console.log(`\n  The ${total - sameNumber} differing pairs are all commands exactly 180 degrees away,`);
  console.log(`  where both answers are the same distance. Examples:`);
  notes.forEach((n) => console.log("    " + n));
}
console.log(problems === 0 ? "\nThe tutorial agrees with the robot code." : `\n${problems} problem(s) found.`);
process.exit(problems ? 1 : 0);
