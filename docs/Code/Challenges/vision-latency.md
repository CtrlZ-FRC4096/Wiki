---
title: 3. Trust a Camera That Tells You the Past
parent: Challenges
nav_order: 3
---

# Trust a Camera That Tells You the Past
{: .no_toc }

Your robot has two ways to know where it is, and both of them lie.

**The wheels** count how far they turned. Smooth, always there, and slowly
wrong, because a wheel is never quite the diameter you typed in and it slips a
little on every turn. Worse, the wheels only know about the wheels. Get shoved
by a defender and they keep counting as if nothing happened.

**The camera** reads an AprilTag and works out where the robot must be for the
tag to look like that. It does not drift. But it is **late**.

## Why the camera is late

Between the light hitting the sensor and the number reaching your code there is
an exposure, a read out, a detection, a pose solve, a network hop and your own
loop. Add it up and a measurement is 90 ms to 230 ms old when you get it.

That does not sound like much. This robot moves at 4.9 m/s.

```
0.14 s late  x  4.9 m/s  =  0.69 m out of date
```

So the camera does not tell you where you are. **It tells you where you were.**
Set your pose from it and the robot jumps backwards down its own path, twelve
times a second. Every controller that reads your pose sees that jump and reacts
to it.

## The idea you need

Do not compare the picture with where you are now. Compare it with **where you
thought you were when the picture was taken**.

To do that, remember. Every loop, write down the time and your pose. When a
measurement for 0.14 s ago arrives, look up what you believed 0.14 s ago and
compare the two. The difference is a real disagreement, with the robot's motion
taken out of it.

Then apply that difference to your pose **now**. This is the part worth
understanding: a correction worked out for a moment in the past is just as true
in the present, because the wheels have been counting the whole time in
between. The wheels are wrong about where you *are*. They are quite good about
how far you have *moved* in the last fifth of a second.

The tidiest way to write it is to hold two numbers: what the wheels have added
up, and a correction to add to them. The camera only ever changes the
correction.

## The two other things

**Some pictures are nonsense.** A tag read as the wrong tag puts the robot
metres away. Throw away a measurement that disagrees with you by more than a
couple of metres.

**But do not make that limit tight.** At 6 s a defender shoves the robot. The
wheels do not notice, so your pose is now wrong by nearly a metre, and every
camera measurement is about to disagree with you by nearly a metre. If your
limit is small you will throw away every one of them, and you will never find
out you were pushed. A gate of 0.35 m never recovers from the shove at all.

That is the trap in every outlier filter ever written: it also rejects the
measurements that were about to tell you that you are wrong.

## The task

{% include interactive/python-exercise.html id="vision_latency" %}

## Why the obvious answers fail

`tools/validate-vision.py` measures each of these over the three runs:

| Answer | Settled error | Worst | Recovers from the shove |
|:-------|:--------------|:------|:------------------------|
| The wheels alone | 0.80 m | 1.25 m | never |
| Believe every picture | 1.97 m | 5.05 m | never |
| Blend in every picture | 0.79 m | 1.63 m | 5.64 s |
| Blend, throw out the wild ones | 0.64 m | 0.87 m | never |
| Rewind to when the picture was taken | **0.069 m** | **0.11 m** | **0.80 s** |

Look at the fourth row. Throwing out the bad measurements is a real
improvement, and it is still nine times worse than the answer. Blending harder
does not fix it either, because the error is not noise. It is a **lag**. Every
picture is old by about the same amount. The error therefore always points
backwards along your path, and blending follows it there.

You cannot filter your way out of a delay. You have to account for it.

{: .note }
> This is what `poseEstimator.py` does on the robot, and what
> `addVisionMeasurement` in WPILib wants a timestamp for. Now you know why the
> timestamp is not optional.

## Next

- [Drive straight while you spin](../second-order-swerve)
