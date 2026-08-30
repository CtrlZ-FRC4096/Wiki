---
title: 1. Find the Game Piece with the Motor Current
parent: Challenges
nav_order: 1
---

# Find the Game Piece with the Motor Current
{: .no_toc }

In [tutorial 3](../../Tutorials/first-rule) you stopped the indexer with one
number. It worked, because everything in that tutorial was perfect.

Nothing on a robot is perfect.

## What is wrong with one number

Put the same code on the real robot and it fails for five separate reasons.

**The motor starts.** A motor that begins to turn pulls a huge current for a
moment, because it is not turning yet and nothing limits it except resistance.
This is called **inrush current**, and it can be 70 A on a motor that never
pulls more than 30 A while it works. Any rule with a number below 70 fires the
moment the indexer starts.

**Every robot idles differently.** A cold indexer, packed with game pieces,
with a tight chain, pulls 30 A with nothing in the path. The same design, run
in, on a weak battery, pulls 5 A. Your number cannot be right for both.

**The battery matters.** A motor on a tired battery gets less voltage, so it
pulls less current for the same work. The same game piece reads a fifth lower.

**The signal is noisy.** The reading moves by an amp or two every sample, and
the battery sags slowly through a match. Any line gets crossed sooner or later
by noise alone.

**Not every touch is a game piece.** A piece can brush the intake and be
knocked away. The current goes up and comes back down, and the robot must not
stop for it.

## The idea you need

You cannot know the idle current in advance. So do not try to. **Measure it on
the robot, at the start of every run, and look for a rise above what you
measured.** That is the whole idea, and it is the answer to a great many
problems on a robot, not only this one.

Two details make it work:

- **Measure it after the motor has settled**, or the inrush ends up in your
  measurement.
- **Use the middle value of your samples, not the average.** One strange sample
  moves an average. It cannot move the middle value. This is a **median**, and
  it is worth knowing.

## The task

{% include interactive/python-exercise.html id="jam_detector" %}

## When you are stuck

Print things. Your code can call `play(run)` and read `RUNS`. Run one case by
hand and look at what it gives you:

```python
for i in range(0, 450, 25):
    print(i * DT, _amps(RUNS[0], i, _at(RUNS[0]["path"], i * DT)))
```

## Why the obvious answers fail

`tools/validate-jam.py` runs whole families of wrong answers against the seven
runs, so these are measured, not opinions:

| Answer | Result |
|:-------|:-------|
| The best possible fixed threshold, already ignoring the inrush | 5 of 7 |
| An average baseline over the first 0.4 s | 5 of 7 |
| A measured baseline, but firing on the first sample above it | 0 of 7 |
| A measured baseline, a margin of 4 A to 10 A, held for 0.16 s | 7 of 7 |

The margin has a band that works, from 4 A to 10 A. Below it the sagging
battery trips the detector. Above it the weak motor never reaches the line. You
are not meant to guess the number. You are meant to find the edges of the band,
the same way you tuned a controller.

## Next

- [Shoot while you are moving](../shoot-on-the-fly)
