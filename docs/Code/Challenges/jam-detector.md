---
title: 1. Find the Game Piece with the Motor Current
parent: Challenges
nav_order: 1
---

# Find the Game Piece with the Motor Current
{: .no_toc }

In [tutorial 3](../../Tutorials/first-rule), one fixed number stopped the
indexer. That number operated because the tutorial has no noise and no
differences between robots. A real robot has both.

## Why one fixed number fails

On the real robot, one fixed number fails for five reasons.

**Inrush current.** When a motor starts, it pulls a large current for a short
time. Until the motor turns, only the resistance of the motor limits the
current. This inrush current can be 70 A on a motor that pulls less than 30 A
during operation. A rule with a number less than 70 A stops the indexer when
the indexer starts.

**Differences between robots.** A cold indexer with a tight chain pulls 30 A
when no game piece is in it. The same design with a loose chain, on a weak
battery, pulls 5 A. One fixed number cannot be correct for both.

**Battery voltage.** A motor on a discharged battery gets less voltage. Thus,
it pulls less current for the same work. With the same game piece, the current
is 20% lower.

**Noise and drift.** The current changes by 1 A to 2 A at each sample. Also,
the battery voltage decreases slowly during a match. Because of the noise and
the drift, the current crosses any fixed line at some time, also when no game
piece is present.

**A game piece that touches the intake and then moves away.** The current
increases and then decreases. The robot must not stop the indexer for this
game piece.

## The method

You cannot know the idle current before the run. Thus, measure it on the robot
at the start of each run. Then, look for an increase above the measured value.
This method also solves many other problems on a robot.

Two details are necessary:

- Measure the idle current after the inrush current stops. If you measure too
  early, the inrush current is in your measurement.
- Use the median of your samples, not the mean. One incorrect sample changes
  the mean. One incorrect sample does not change the median. To find the
  median, sort the samples and use the middle value.

## The task

{% include interactive/python-exercise.html id="jam_detector" %}

## How to examine the data

Add the code at the bottom of your answer, below your class. `RUNS` is the list
of the seven runs. This code shows the time in seconds, the position of the
game piece in cm, and the current in A. It shows the first run, at intervals
of 0.5 s:

```python
run = RUNS[0]
for i in range(0, 450, 25):
    where = _at(run["path"], i * DT)
    print(i * DT, where, _amps(run, i, where))
```

`play(RUNS[0])` operates your `JamDetector` on that run. It gives the time when
your detector stopped the indexer, or `None`. It also gives the position of the
game piece at the end, in cm. Remove this code when you finish, because it
operates each time that you push **Run checks**.

## Why the obvious answers fail

`tools/validate-jam.py` tests groups of incorrect answers on the seven runs.
The table shows the results:

| Answer | Result |
|:-------|:-------|
| The best possible fixed threshold, which ignores the inrush current | 5 of 7 |
| A measured value that is the mean of the first 0.4 s, with the inrush current in it | 5 of 7 |
| A measured value, but the detector stops the indexer at the first sample above it | 0 of 7 |
| A measured value, a margin of 4 A to 10 A, and a hold time of 0.16 s | 7 of 7 |

A margin from 4 A to 10 A operates. With a margin of less than 4 A, the
battery voltage decreases and the detector stops the indexer with no game
piece present. If the margin is more than 10 A, the current of the weak
motor does not get to the line. Do not guess the margin. Find the two limits of
the band, as you did when you tuned a controller.

## Next

- [Shoot while you are moving](../shoot-on-the-fly)
