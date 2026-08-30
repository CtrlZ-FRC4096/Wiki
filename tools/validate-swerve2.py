#!/usr/bin/env python3
"""Check that the second-order swerve challenge is about what it says.

A swerve drive holds a robot-frame speed for a whole period while it turns, so
the field-frame direction of that speed turns with it. This measures how far
each answer drifts off a straight line, and checks the case that catches the
divide by zero.

Run:  python3 tools/validate-swerve2.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from challenge_harness import Challenge

C = Challenge("second_order_swerve")
C.basics()

NAIVE = C.data["starter"]

HALF = """
import math

def command(heading, vx_field, vy_field, omega, dt):
    a = -(heading + omega * dt * 0.5)
    c, s = math.cos(a), math.sin(a)
    return vx_field * c - vy_field * s, vx_field * s + vy_field * c, omega
"""

UNGUARDED = C.data["solution"].replace(
    "    if abs(omega) < 1e-9:\n        return bx, by, omega\n", "")


def drift(source):
    """The worst distance off the path, over every case."""
    ns = C.fresh()
    exec(compile(source, "an answer", "exec"), ns)
    worst = 0.0
    for case in ns["CASES"]:
        try:
            worst = max(worst, ns["drive"](case)[0])
        except ZeroDivisionError:
            return None
    return worst


print("\n--- how far off the path each answer gets, worst of the seven cases ---")
for name, source in [("rotate by the heading", NAIVE),
                     ("rotate by the middle of the period", HALF),
                     ("undo the turn exactly", C.data["solution"])]:
    got = drift(source)
    print("      %-36s %7.4f m   %d of %d cases"
          % (name, got, C.score(source), C.total))

print("\n--- the traps ---")
naive_drift, half_drift, exact_drift = drift(NAIVE), drift(HALF), drift(C.data["solution"])
C.check(naive_drift > 0.5,
        "the usual field-relative maths drifts more than half a metre")
C.check(C.score(NAIVE) < C.total, "the usual maths fails the challenge")
C.check(half_drift < 0.02,
        "using the heading from the middle of the period is good enough to pass")
C.check(exact_drift < half_drift,
        "undoing the turn exactly is better still")
C.check(naive_drift > 50 * exact_drift,
        "the gap is a factor of tens, not a few percent")

print("\n--- the case that catches the divide by zero ---")
C.check(drift(UNGUARDED) is None,
        "the exact maths without a guard divides by zero when omega is 0")
still = C.fresh()
exec(compile(NAIVE, "an answer", "exec"), still)
C.check(still["drive"](still["CASES"][4])[0] < 1e-9,
        "with no spin the simple answer is exactly right, so that case is fair")

C.explains_itself()
C.done()
