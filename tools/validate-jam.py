#!/usr/bin/env python3
"""Check that the jam-detector challenge is hard for the right reasons.

An exercise is only worth setting if the obvious answer really fails and the
intended answer really passes. This throws families of answers at the seven
runs and checks each trap does its job:

  1. No fixed current threshold passes, not even the best possible one, and not
     even one that already knows to ignore the motor starting up.
  2. A baseline taken as an average over the start fails, because the inrush
     current lands in it. The middle value survives it.
  3. Firing on the first sample above the line fails, because noise crosses any
     line for a single sample.
  4. The margin above the baseline sits in a band. Too small and the sagging
     battery trips it. Too large and the weak motor never reaches it.

Run:  python3 tools/validate-jam.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from challenge_harness import Challenge

C = Challenge("jam_detector", cases="RUNS")
C.basics()

print("\n--- trap 1: a fixed threshold, even one that ignores the motor starting ---")
FIXED = """
class JamDetector:
    def __init__(self):
        self.t = 0.0

    def update(self, amps, dt):
        self.t += dt
        return self.t >= 0.30 and amps > %r
"""
best, best_at = 0, None
for tenths in range(30, 1200):
    amps = tenths / 10.0
    got = C.score(FIXED % amps)
    if got > best:
        best, best_at = got, amps
print("      the best fixed threshold is %s A, and it gets %d of %d" % (best_at, best, C.total))
C.check(best < C.total, "no fixed threshold passes, so the baseline must be measured")

print("\n--- trap 2: an average baseline, taken from the start of the run ---")
MEAN = """
class JamDetector:
    def __init__(self):
        self.t, self.seen, self.base, self.above = 0.0, [], None, 0.0

    def update(self, amps, dt):
        self.t += dt
        if self.t < 0.40:
            self.seen.append(amps)
            return False
        if self.base is None:
            self.base = sum(self.seen) / len(self.seen)
        self.above = self.above + dt if amps > self.base + 8.0 else 0.0
        return self.above >= 0.16
"""
got = C.score(MEAN)
print("      an average over the first 0.4 s gets %d of %d" % (got, C.total))
C.check(got < C.total, "the inrush current spoils an average baseline")

TEMPLATE = """
class JamDetector:
    def __init__(self):
        self.t, self.seen, self.base, self.above = 0.0, [], None, 0.0

    def update(self, amps, dt):
        self.t += dt
        if self.t < 0.30:
            return False
        if self.t < 0.70:
            self.seen.append(amps)
            return False
        if self.base is None:
            self.seen.sort()
            self.base = self.seen[len(self.seen) // 2]
        self.above = self.above + dt if amps > self.base + %r else 0.0
        return self.above >= %r
"""

print("\n--- trap 3: no hold, so one noisy sample is enough ---")
C.check(C.score(TEMPLATE % (8.0, 0.0)) < C.total,
        "firing on the first sample above the line fails")

print("\n--- trap 4: the margin has to be found, not guessed ---")
good = [m for m in range(1, 25) if C.score(TEMPLATE % (float(m), 0.16)) == C.total]
print("      margins that pass everything: %s A" % (good,))
C.check(len(good) >= 4, "there is a band of margins that work, not one value")
C.check(bool(good) and min(good) > 1, "a tiny margin fails, so noise and sag are real")
C.check(bool(good) and max(good) < 24, "a huge margin fails, so the weak motor is real")

C.explains_itself()
C.done()
