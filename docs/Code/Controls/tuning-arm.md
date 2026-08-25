---
title: How to Tune an Arm
parent: Controls
nav_order: 4
---

# How to Tune a Pivoting Arm
{: .no_toc }

<details open markdown="block">
  <summary>Contents</summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

Read [How to Tune a Controller](../tuning) first. This page gives the procedure
for an arm.

## Properties of an arm

An arm uses **position** control, and gravity applies a load to it at all
times. Two conditions follow from this:

- **The gravity load changes with the angle.** When the arm is horizontal, the
  full weight of the arm turns it down. When the arm is vertical, gravity acts
  along the arm and applies almost no torque to the pivot. Therefore `kG` is
  multiplied by the cosine of the angle.
- **Do not command a step change.** A command to move 135° immediately requests
  an infinite speed. The controller applies the maximum voltage and the arm
  overshoots. The simulator commands a **motion profile** instead. The profile
  has a limit of 150°/s and 300°/s².

The arm in the simulator moves from a stowed position at −75° to your target,
then to −30°. The target slider covers the full travel from −90° to +90°. **0°
is horizontal.** This is the angle of maximum gravity load.

The arm is not one rigid body. The motor and the gearbox have their own
inertia. The structure between the gearbox and the load has flexure. The chain
has approximately 0.8° of backlash.

These properties cause the arm to oscillate when `kP` is too high. The
oscillation frequency is approximately 10 Hz. This is the resonance of the arm
structure. A rigid arm accepts an unlimited `kP` and shows you nothing.

{: .note }
> `kA` has a fixed value and no slider. A low `kV` and a high `kA` give almost
> the same plot. Therefore you cannot separate them by eye. Measure both with
> SysId on the robot.

## Procedure

**1. Set all the gains to 0.** The arm falls to the hard stop.

**2. Tune `kG`.** Press **Tune kG**. The arm moves to 0°, the angle of maximum
gravity load. All the other gains are 0, thus only `kG` holds the arm. Increase
`kG` until the arm stops to move down. If `kG` is too high, the arm moves up.
This value is the voltage to hold the arm against its own weight.

**3. Tune `kV`.** Press **Tune kV**. `kV` is volts for each degree per second.
Compare the arm to the dashed setpoint line during the movement. If `kV` is too
low, the arm is behind the line. If `kV` is too high, the arm is in front of the
line. Approximately three slider positions pass, because `kV` alone controls
the arm when the feedback gains are 0.

**4. Tune `kP`.** Press **Full loop**. Feedforward moves the arm to a position
near the target. `kP` moves the arm onto the target and holds it. Increase `kP`
until the arm stops on the line.

**5. Find the value of `kP` that causes oscillation.** Continue to increase
`kP`. Above approximately 2.5 the arm oscillates around the target. This is the
arm structure, not the motor. Record the value, then decrease `kP` to
approximately one half of it.

**6. Tune `kD`.** The arm continues to overshoot the target. `kD` decreases the
overshoot. Increase `kD` in small steps. Above approximately 0.1, `kD`
increases the sensor noise and the oscillation returns.

{% include interactive/pid-sim.html plant="arm" title="Pivoting arm — position control against gravity" %}

<details markdown="block">
  <summary>Show a reasonable answer</summary>

`kG` is approximately 0.45. `kV` is approximately 0.05. `kP` is approximately
1.5. `kD` is approximately 0.06.

On the robot the configuration is:

```python
config.slot0.k_g = 0.45
config.slot0.k_v = 0.05
config.slot0.k_p = 1.5
config.slot0.k_d = 0.06
config.motion_magic.motion_magic_cruise_velocity = 150
config.motion_magic.motion_magic_acceleration = 300
```

</details>

## On the robot

{: .warning }
> Test the tuning at more than one target angle. An arm that is tuned near the
> horizontal position can operate differently near the vertical position. The
> gravity load is different at each angle. Use the target slider to test all
> the angles that the arm uses.

The flexure and the backlash in this simulator are small values. On a real arm
these values increase during a season, because fasteners become loose and a
chain becomes longer. A tuning that is correct in week one can oscillate at a
championship.

If you cannot remove the oscillation with the gains, the correction is
mechanical.

## References

- [WPILib: Tuning a vertical arm position controller](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/tuning-vertical-arm.html){:target="_blank"}
