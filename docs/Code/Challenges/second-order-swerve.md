---
title: 4. Drive Straight While You Spin
parent: Challenges
nav_order: 4
---

# Drive Straight While You Spin
{: .no_toc }

Every swerve example contains a line like this:

```python
speeds = ChassisSpeeds.fromFieldRelativeSpeeds(vx, vy, omega, heading)
```

It takes the speed you want in the field and rotates it into the robot's own
frame, because the wheels are bolted to the robot and not to the field. It is
correct. It is also correct for **one instant only**, and your robot does not
live in an instant.

## What a period is

The roboRIO decides once every 20 ms. It sends a speed to the drive, and the
drive holds that speed until the next decision. Nothing changes in between.

Now spin the robot while that speed is held. The speed is in the robot's frame,
so **it turns with the robot**. At the start of the period the wheels push north.
Ten milliseconds later the robot has turned, and the same wheel command pushes
slightly east of north. By the end of the period it is pushing further east
still.

Add that up over one period and the robot has gone somewhere that is not what
the maths says. Add it up over 150 periods and the robot has slid **0.63 m**
off a straight line.

This is not wheel slip. It is not a bad gyro, or a loose module, or a bad kP.
It is the difference between a speed that is right for an instant and a speed
that is held for a period.

## What is really happening

Hold a robot-frame speed for a period `dt` while turning at `omega`. The robot
frame sweeps through an angle of `theta = omega * dt` during that time. The
field displacement is not `speed * dt` in the starting direction. It is that
displacement **turned by half of theta** and **shortened**, because the
direction was sweeping the whole time and the ends do not line up with the
middle.

The whole answer is one small matrix:

```
A = (1 / theta) * [[ sin theta,      -(1 - cos theta) ],
                   [ 1 - cos theta,   sin theta       ]]
```

Hold speed `v` for the period and you land at `A * v * theta`, not `v * dt`. So
if you know where you want to land, ask for `A` inverse times what you wanted.

WPILib calls this `ChassisSpeeds.discretize`. Now you know what it is for.

If that matrix is too much at first, there is a good approximation that will
pass: **use the heading from the middle of the period, not the start**. It gets
within 0.007 m, and it is the first term of the exact answer.

## The trap in the exact answer

Look at that matrix again with `theta` at zero.

`sin(0) / 0`. A robot that is not turning divides by zero and the whole drive
stops. One of the seven cases does not spin at all, and it is there for exactly
this reason. This is the bug people hit in real `discretize` code.

## The task

{% include interactive/python-exercise.html id="second_order_swerve" %}

## Why the obvious answer fails

`tools/validate-swerve2.py` measures each answer over all seven cases:

| Answer | Worst distance off the path | Cases scored |
|:-------|:----------------------------|:-------------|
| Rotate by the heading | 0.627 m | 1 of 7 |
| Rotate by the heading in the middle | 0.007 m | 7 of 7 |
| Undo the turn exactly | 0.003 m | 7 of 7 |

The usual answer is nearly 200 times worse than the exact one. The one case it
gets right is the one where the robot never spins.

## Where this goes next

The same "right for an instant, wrong for a period" problem returns in the
modules themselves. `optimize()` reverses a module to turn 30° instead of 150°.
It assumes the module turns instantly. It does not. Give the module a steering
rate limit and the shorter turn is not always the faster one. The module also
drives in the wrong direction while it gets there.

That one is not built yet. Build it.

{: .note }
> There is a simpler version of the module problem in
> [Swerve Module Optimization](../../Tutorials/swerve-module-optimization), which
> assumes instant steering. Do that one first if you have not.
