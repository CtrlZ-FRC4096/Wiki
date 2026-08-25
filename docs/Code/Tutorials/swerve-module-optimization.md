---
title: Swerve Module Optimization
parent: Tutorials
nav_order: 3
---

# Swerve Module Optimization
{: .no_toc }

<details open markdown="block">
  <summary>Contents</summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

## The problem

A swerve module has two motors. One turns the wheel. One points the wheel.

The driver moves the joystick from forwards to almost backwards. The kinematics
calculates a new angle for each module, 170° away from the present angle. The
module now turns 170°.

That movement takes time. While the module turns, the wheel points in the wrong
direction and the robot does not go where the driver asked. Four modules do this
at the same time, thus the robot moves in an unwanted direction for a moment.

The correction uses one fact: **the wheel can turn in two directions.** A
command 170° away is the same as a command 10° away with the wheel driven
backwards. The module then turns 10° instead of 170°.

A module never needs to turn more than 90°.

## See it

Move the sliders. The orange arc is the movement without the optimisation. The
green arc is the movement with it.

{% include interactive/swerve-dial.html title="One swerve module" %}

Press **Command the worst case** to see the largest difference. A command 180°
away needs no steering movement at all. The module only drives backwards.

## Find the equivalent angle

Before you can compare two angles, they must be in the same range. A module can
turn many times in one direction, thus its angle is not limited to 0° to 360°.

{% include interactive/python-exercise.html id="angle_wrap" %}

{: .note }
> A command exactly 180° away has two correct answers. Both are the same
> distance. Our robot code and the solution above select different ones. This
> makes no difference to the robot, because the wheel ends in the same place.

## Do the optimisation

{% include interactive/python-exercise.html id="swerve_optimize" %}

## What our robot code does

[`robot/swerve/ctre_module_state.py`](https://github.com/CtrlZ-FRC4096/Robot-2026/blob/main/robot/swerve/ctre_module_state.py)
does the same work in a longer form:

```python
def optimize(desired_state: SwerveModuleState, current_angle: Rotation2d):
    target_angle = in_0_to_360_scope(
        current_angle.degrees(), desired_state.angle.degrees()
    )
    target_speed: float = desired_state.speed
    delta = target_angle - current_angle.degrees()
    if abs(delta) > 90:
        target_speed = -target_speed
        if delta > 90:
            target_angle = target_angle - 180
        else:
            target_angle = target_angle + 180
    return SwerveModuleState(target_speed, Rotation2d.fromDegrees(target_angle))
```

`in_0_to_360_scope` does the same work as `nearest_equivalent`. It uses two
`while` loops instead of the remainder operator. The two functions give the same
result, except at exactly 180°, where both answers are correct.

`node tools/validate-swerve.js` compares the two forms across 156 pairs of
angles. The wrap functions give an identical value in 149 pairs. The other 7
are commands exactly 180° away, where both answers are the same distance.

After the optimisation, all 156 pairs agree. The wheel ends in the same place
and pushes the robot the same way. Neither form ever turns more than 90°.

## Limits of the optimisation

- **The wheel direction reverses.** If a mechanism must know the direction of
  travel, it cannot use the sign of the module speed alone.
- **A module at rest still turns.** A speed of zero with a new angle command
  still moves the steering motor. Some teams hold the last angle when the speed
  is near zero. This stops the modules from moving while the robot waits.
- **This does not correct skid.** The optimisation selects a shorter movement.
  It does not make the wheels reach the angle more quickly. That is the
  steering controller, and you tune it with the method in
  [How to Tune a Controller](../../Controls/tuning).

## References

- [`robot/swerve/ctre_module_state.py`](https://github.com/CtrlZ-FRC4096/Robot-2026/blob/main/robot/swerve/ctre_module_state.py)
- [Unit Conversions](../unit-conversions) — the previous tutorial
- [WPILib: Swerve drive kinematics](https://docs.wpilib.org/en/stable/docs/software/kinematics-and-odometry/swerve-drive-kinematics.html){:target="_blank"}
