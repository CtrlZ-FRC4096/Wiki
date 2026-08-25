---
title: Joystick Deadbands
parent: Tutorials
nav_order: 1
---

# Joystick Deadbands
{: .no_toc }

<details open markdown="block">
  <summary>Contents</summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

## The problem

Put an Xbox controller on a table. Do not touch it. Then read the joystick
axes. The value is not `0.0`. A worn controller gives a value between `0.01`
and `0.08`. The value also changes as the controller becomes warm.

This small value goes to the drivetrain. The robot then moves slowly across the
carpet while the driver does nothing. The odometry becomes incorrect. This is
not an error in your logic. It is a property of the hardware, and your code
must remove it.

The correction is a **deadband**. A deadband is a range near zero. The code
sets all the values in this range to zero.

{: .note }
> WPILib contains `wpimath.applyDeadband`. Use that function on the robot. Write
> the function one time here to learn its effect on the control of the robot.

## Remove the drift

Write the simple version first. If the joystick value is small, set it to zero.

{% include interactive/python-exercise.html id="deadband" %}

## The problem with the simple version

Drive with the code that you wrote. The robot starts with a step change of
speed. Use a deadband of `0.1` as an example. When the joystick goes past the
limit, the output changes from 0 to 10% power immediately. There is no slow
start.

| Joystick | Simple deadband | Necessary output |
|:---------|:----------------|:-----------------|
| 0.09     | 0.0             | 0.0              |
| 0.11     | **0.11**        | approximately 0.01 |
| 0.55     | 0.55            | 0.5              |
| 1.00     | 1.0             | 1.0              |

The joystick must move to its limit for full power. Therefore the usable range
is `0.1` to `1.0`. Increase that range to `0.0` to `1.0` and the step change is
removed.

## Make the output continuous

{% include interactive/python-exercise.html id="deadband_scaled" %}

## How to select the deadband value

If the value is too small, the drift continues. If the value is too large, the
driver loses control near the center of the joystick.

1. Start at `0.05`.
2. Increase the value until a controller on a table causes no movement.
3. Do this test with all the controllers, not only the good one. Use the value
   from the worst controller.
4. If a controller needs more than approximately `0.15`, it is worn. Replace
   the controller. Do not correct it in the code.

## References

- [Controls](../../Controls/controls) — where the joystick value goes next
- [WPILib: Joysticks](https://docs.wpilib.org/en/stable/docs/software/basic-programming/joystick.html){:target="_blank"}
