#!/usr/bin/env python3
"""Check that the shoot-on-the-fly challenge really needs the fixed point.

The answer depends on itself: to aim you need the flight time, and the flight
time comes from the distance you are aiming at. This measures how far each
number of rounds of correction actually gets, so the page can quote it.

Run:  python3 tools/validate-shoot.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from challenge_harness import Challenge

C = Challenge("shoot_on_the_fly")
C.basics()

AIM = """
import math

def aim(px, py, vx, vy):
    dx, dy = GOAL[0] - px, GOAL[1] - py
    distance, heading = math.hypot(dx, dy), math.atan2(dy, dx)
    for _ in range(%d):
        tof = flight_time(distance)
        rx, ry = dx - vx * tof, dy - vy * tof
        distance, heading = math.hypot(rx, ry), math.atan2(ry, rx)
    return heading, distance
"""


def worst(source):
    """The biggest miss this answer makes, in metres."""
    ns = C.fresh()
    exec(compile(source, "an answer", "exec"), ns)
    return max(ns["fire"](case)[1] for case in ns["CASES"])


print("\n--- how close each number of corrections gets ---")
ladder = []
for rounds in range(0, 6):
    got = C.score(AIM % rounds)
    miss = worst(AIM % rounds)
    ladder.append((rounds, got, miss))
    label = "no correction at all" if rounds == 0 else "%d correction%s" % (rounds, "" if rounds == 1 else "s")
    print("      %-22s worst miss %5.2f m   %d of %d cases" % (label, miss, got, C.total))

print("\n--- the traps ---")
C.check(ladder[0][1] < C.total, "aiming straight at the goal fails")
C.check(ladder[1][1] < C.total, "one correction fails, because it used the wrong flight time")
C.check(ladder[2][1] < C.total, "two corrections still fail")
C.check(ladder[4][1] == C.total, "the answer does settle, so the challenge is possible")
C.check(ladder[0][2] > 3.0, "aiming straight misses by metres, not centimetres")
C.check(ladder[1][2] > 2 * ladder[2][2], "each round of correction is a real improvement")

print("\n--- a loop that never settles is stopped, not left to hang ---")
RUNAWAY = """
import math

def aim(px, py, vx, vy):
    dx, dy = GOAL[0] - px, GOAL[1] - py
    distance = math.hypot(dx, dy)
    while True:
        flight_time(distance)
"""
got, misses = C.run(RUNAWAY)
C.check(got == 0 and misses and "500" in misses[0][1],
        "a runaway loop is caught and explained")

C.explains_itself()
C.done()
