#!/usr/bin/env python3
"""Check that the vision challenge really needs latency compensation.

A camera picture is taken before you get it. On a robot at 4.9 m/s a 0.14 s old
picture is 0.69 m out of date. This measures the families of answers a student
reaches for, to prove that only the one that rewinds to the moment the picture
was taken can pass.

Run:  python3 tools/validate-vision.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from challenge_harness import Challenge

C = Challenge("vision_latency",
              checks=("check_accuracy", "check_outliers", "check_recovery"))
C.basics()

ODOMETRY = """
class PoseEstimator:
    def __init__(self, x, y): self.x, self.y = x, y
    def update(self, dt, vx, vy): self.x += vx * dt; self.y += vy * dt
    def add_vision(self, timestamp, x, y): pass
    def pose(self): return self.x, self.y
"""

SNAP = ODOMETRY.replace("def add_vision(self, timestamp, x, y): pass",
                        "def add_vision(self, timestamp, x, y): self.x, self.y = x, y")

BLEND = """
class PoseEstimator:
    K = 0.20
    def __init__(self, x, y): self.x, self.y = x, y
    def update(self, dt, vx, vy): self.x += vx * dt; self.y += vy * dt
    def add_vision(self, timestamp, x, y):
        self.x += self.K * (x - self.x)
        self.y += self.K * (y - self.y)
    def pose(self): return self.x, self.y
"""

BLEND_GATED = """
import math

class PoseEstimator:
    K, GATE = 0.20, 2.0
    def __init__(self, x, y): self.x, self.y = x, y
    def update(self, dt, vx, vy): self.x += vx * dt; self.y += vy * dt
    def add_vision(self, timestamp, x, y):
        if math.hypot(x - self.x, y - self.y) > self.GATE:
            return
        self.x += self.K * (x - self.x)
        self.y += self.K * (y - self.y)
    def pose(self): return self.x, self.y
"""


def measure(source):
    """The three numbers, worst over the three runs."""
    ns = C.fresh()
    exec(compile(source, "an answer", "exec"), ns)
    rows = [ns["report"](case) for case in ns["CASES"]]
    return (max(r["steady"] for r in rows),
            max(r["late"] for r in rows),
            max(r["recover"] for r in rows))


print("\n--- what each answer actually achieves, worst of the three runs ---")
print("      %-30s %8s %8s %10s" % ("", "settled", "worst", "recovery"))
table = []
for name, source in [("the wheels alone", ODOMETRY),
                     ("believe every picture", SNAP),
                     ("blend, believe every picture", BLEND),
                     ("blend, throw out the wild ones", BLEND_GATED),
                     ("rewind to when it was taken", C.data["solution"])]:
    steady, late, recover = measure(source)
    table.append((name, steady, late, recover, C.score(source)))
    print("      %-30s %7.3fm %7.3fm %9s   %d of %d checks"
          % (name, steady, late,
             "never" if recover > 90 else "%.2fs" % recover,
             C.score(source), C.total))

print("\n--- the traps ---")
by_name = {row[0]: row for row in table}
C.check(by_name["the wheels alone"][1] > 0.5,
        "the wheels alone drift far enough to matter")
C.check(by_name["believe every picture"][2] > 2.0,
        "believing every picture is worse than ignoring them")
C.check(by_name["blend, throw out the wild ones"][1] > 0.15,
        "throwing out the wild ones is still not enough, because the picture is old")
C.check(by_name["rewind to when it was taken"][1] < 0.10,
        "rewinding to the moment the picture was taken does work")
C.check(by_name["rewind to when it was taken"][1] * 3
        < by_name["blend, throw out the wild ones"][1],
        "rewinding is several times better, not a little better")
C.check(by_name["blend, believe every picture"][2] > 0.30,
        "a wild picture has to be thrown out, blending is not enough on its own")

print("\n--- the gate must not be so tight that the shove locks it out ---")
TIGHT = BLEND_GATED.replace("K, GATE = 0.20, 2.0", "K, GATE = 0.20, 0.35")
tight_recover = measure(TIGHT)[2]
print("      a 0.35 m gate recovers from the shove in %s"
      % ("never" if tight_recover > 90 else "%.2f s" % tight_recover))
C.check(tight_recover > 1.5, "too tight a gate never recovers from the shove")

C.explains_itself()
C.done()
