---
title: Unit Conversions
parent: Tutorials
nav_order: 2
---

# Unit Conversions
{: .no_toc }

<details open markdown="block">
  <summary>Contents</summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

## Why this matters

A motor controller does not report metres per second. It reports encoder
counts. Somewhere in the code, a person must convert one to the other.

If that conversion is wrong by a factor of the gear ratio, the mechanism moves
5.68 times too fast or 5.68 times too slow. The code has no error. The
mechanism simply does the wrong thing, and the cause is difficult to find on a
field.

Our conversions are in
[`robot/swerve/conversions.py`](https://github.com/CtrlZ-FRC4096/Robot-2026/blob/main/robot/swerve/conversions.py).
This page makes you write them.

## The numbers you need

| Value | Amount | Where it comes from |
|:------|:-------|:--------------------|
| Falcon counts for one motor turn | 2048 | The encoder in the motor |
| CANcoder counts for one turn | 4096 | The absolute encoder on the steering |
| Falcon velocity period | 100 ms | The motor controller reports counts for each 100 ms |
| Swerve drive gear ratio | 5.68 | `const.SWERVE_DRIVE_GEAR_RATIO` |
| Swerve steering gear ratio | 12.1 | `const.SWERVE_ANGLE_GEAR_RATIO` |
| Swerve wheel circumference | 0.3192 m | A 4 inch wheel |

{: .note }
> These are Phoenix 5 units. Phoenix 6 reports rotations and rotations for each
> second, thus it removes most of this arithmetic. The conversions stay in our
> repository, and the same errors occur with any sensor that counts. Learn the
> method, not the constant.

## Speed of the motor

{% include interactive/python-exercise.html id="falcon_rpm" %}

## Speed of the robot

{% include interactive/python-exercise.html id="falcon_mps" %}

## Write the inverse

Almost every conversion has a partner that goes the other way. The partner is
easy to get wrong, because the two functions look almost the same.

{% include interactive/python-exercise.html id="cancoder_roundtrip" %}

{: .warning }
> **This is a real error in our repository.** `degrees_to_CANcoder` in
> `robot/swerve/conversions.py` multiplies where it must divide. It is the same
> expression as `CANcoder_to_degrees`, thus it is not the inverse.
>
> `degrees_to_falcon`, three lines below it, has the correct form. Compare the
> two.
>
> Nothing calls `degrees_to_CANcoder` today, thus the robot is not affected. But
> the next person to use it will get a value that is approximately 130 times too
> small. The round-trip check in the exercise above finds this error in one
> line.

## The method

Use this sequence for any conversion:

1. Write the units at each step. Counts, counts for each 100 ms, motor turns
   for each minute, wheel turns for each minute, metres for each second.
2. Change one unit at each step. Do not combine steps.
3. For a gear ratio, decide which value is larger. The motor turns more times
   than the mechanism, thus motor RPM divided by the gear ratio gives mechanism
   RPM.
4. Test one known value. One full turn, or one metre.
5. Test a round trip. Convert in one direction, then back again.

Step 5 is the one that people do not do, and it is the one that finds errors.

## References

- [`robot/swerve/conversions.py`](https://github.com/CtrlZ-FRC4096/Robot-2026/blob/main/robot/swerve/conversions.py)
- [Swerve Module Optimization](../swerve-module-optimization) — the next tutorial
- [CTRE Phoenix 6: units](https://v6.docs.ctr-electronics.com/en/stable/docs/api-reference/api-usage/status-signals.html){:target="_blank"}
