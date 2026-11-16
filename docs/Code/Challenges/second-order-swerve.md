---
title: 4. Drive Straight While You Spin
parent: Challenges
nav_order: 4
---

# Drive Straight While You Spin
{: .no_toc }

Most swerve examples contain this line:

```python
speeds = ChassisSpeeds.fromFieldRelativeSpeeds(vx, vy, omega, heading)
```

This line rotates the field speed into the frame of the robot, because the
wheels are attached to the robot, not to the field. The line is correct only for
one instant. The robot holds the command for a full period, and the robot turns
during that period.

## What a period is

The roboRIO calculates a new command every 20 ms. The drive holds that command
until the next calculation. The command does not change during the period.

The command is a speed in the frame of the robot. If the robot turns during the
period, the direction of that speed on the field turns with the robot. For
example, at the start of the period the wheels push to the north. 10 ms later,
the robot has turned, and the same command pushes at a small angle east of
north. At the end of the period, the angle is larger.

After one period, the robot is not at the position that the calculation gave.
After 150 periods, the robot is 0.63 m from the straight line.

The cause is not wheel slip, an incorrect gyro, a loose module, or an incorrect
kP. The cause is that a speed that is correct for one instant is held for a full
period.

## The mathematics

Hold a robot-frame speed for a period `dt` while the robot turns at `omega`.
During the period, the robot frame turns through the angle `theta = omega * dt`.
The movement on the field is not `speed * dt` in the direction at the start of
the period. It is that movement, turned by `theta / 2` and made shorter. The
direction changes during the full period, so the movement at the ends is not in
the same direction as the movement in the middle.

This matrix gives the result:

```
A = (1 / theta) * [[ sin theta,      -(1 - cos theta) ],
                   [ 1 - cos theta,   sin theta       ]]
```

If the robot holds the robot-frame speed `v` for the period, it moves
`A * v * dt`, in the frame of the robot at the start of the period. It does not
move `v * dt`. To get to a specified position, command the speed `A` inverse
multiplied by the speed that you want.

WPILib calls this calculation `ChassisSpeeds.discretize`.

There is also an approximate method that passes the checks. Use the heading
from the middle of the period, not the heading at the start. The error of this
method is less than 0.007 m. This method is the first term of the exact answer.

## The division by zero in the exact answer

When `theta` is zero, the matrix contains `sin(0) / 0`. If the robot does not
turn, the calculation divides by zero, and the drive stops. One of the seven
cases has no rotation, to test this condition. This is a known error in
`discretize` code.

## The task

{% include interactive/python-exercise.html id="second_order_swerve" %}

## Why the obvious answer fails

`tools/validate-swerve2.py` tests each answer on the seven cases:

| Answer | Largest distance from the path | Cases scored |
|:-------|:-------------------------------|:-------------|
| Rotate by the heading | 0.627 m | 1 of 7 |
| Rotate by the heading in the middle of the period | 0.007 m | 7 of 7 |
| Use the inverse of `A` | 0.003 m | 7 of 7 |

The error of the usual answer is approximately 200 times larger than the error
of the exact answer. The usual answer passes only the case with no rotation.

## A related problem

The same problem occurs in the swerve modules. `optimize()` reverses a module,
so that the module turns 30° and not 150°. This calculation assumes that the
module turns immediately, but it does not. If the steering has a rate limit,
the smaller turn is not always the faster turn. Also, during the turn, the
module drives in an incorrect direction.

There is no challenge for this problem yet. You can write one.

{: .note }
> [Swerve Module Optimization](../../Tutorials/swerve-module-optimization)
> contains a simpler version of the module problem, with immediate steering. Do
> that tutorial first.
