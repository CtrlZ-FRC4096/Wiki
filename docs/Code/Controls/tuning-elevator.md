---
title: How to Tune an Elevator
parent: Controls
nav_order: 5
---

# How to Tune an Elevator
{: .no_toc }

<details open markdown="block">
  <summary>Contents</summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

Read [How to Tune a Controller](../tuning) first. If you completed
[How to Tune an Arm](../tuning-arm), this procedure is almost the same. One
condition is more simple.

## Properties of an elevator

An elevator uses **position** control against gravity, the same as an arm. But
the gravity load does not change with the height. A carriage at 2 inches has
the same weight as a carriage at 50 inches.

Therefore `kG` is a constant. It is not multiplied by a cosine. One value of
`kG` is correct for the full travel.

An elevator is the most simple of the three mechanisms. It has three sliders:

- **There is no `kA` slider.** Measure `kA` with SysId, for the same reason as
  the arm.
- **There is no `kD` slider.** The gearbox on this carriage gives sufficient
  damping. `kD` makes no visible change. The arm needs `kD`, because the arm
  has less damping.

The elevator in the simulator moves from 0 to 60 inches. The profile has a
limit of 45 in/s and 100 in/s².

**The carriage starts at 25 inches, not at the bottom hard stop.** This is
important. A carriage on the hard stop is held by the stop. Then an incorrect
`kG` looks the same as a correct `kG`. Only a carriage between the stops shows
the correct value.

The rope has elasticity and the gearbox has backlash. Therefore a high `kP`
makes the carriage oscillate.

## Procedure

**1. Set all the gains to 0.** The carriage falls to the bottom.

**2. Tune `kG`.** Press **Tune kG**. The carriage moves to the center of its
travel. All the other gains are 0. Increase `kG` until the carriage stops to
move down. If `kG` is too high, the carriage moves up. Gravity is constant,
thus this one value is correct for the full travel.

**3. Tune `kV`.** Press **Tune kV**. `kV` is volts for each inch per second.
Compare the carriage to the dashed setpoint line during the movement. If `kV`
is too low, the carriage is behind the line. If `kV` is too high, the carriage
is in front of the line.

**4. Tune `kP`.** Press **Full loop**. Increase `kP` until the carriage stops
at the target height. Above approximately 7 the carriage oscillates on the
elasticity of the rope. Decrease `kP` to a value well below that.

{% include interactive/pid-sim.html plant="elevator" title="Elevator — position control, constant gravity" %}

<details markdown="block">
  <summary>Show a reasonable answer</summary>

`kG` is approximately 0.60. `kV` is approximately 0.18. `kP` is approximately 2.

`kP` has a large acceptable range. Values from approximately 0.5 to 6 pass the
checks. This is a property of the mechanism. A mechanism with sufficient
damping and correct feedforward needs only a small feedback gain. For this
reason, the elevator is the mechanism to learn on.

On the robot the configuration is:

```python
config.slot0.k_g = 0.60
config.slot0.k_v = 0.18
config.slot0.k_p = 2.0
config.motion_magic.motion_magic_cruise_velocity = 45
config.motion_magic.motion_magic_acceleration = 100
```

</details>

## On the robot

{: .warning }
> An incorrect tuning can cause damage to an elevator. A carriage that
> overshoots at the top of the travel hits the hard stop at speed. Before you
> tune, set the soft limits in the code. Tune the bottom half of the travel
> first. Keep your hand near the disable button.

A real elevator also needs a `kS` value. Stages that bind, bearings with drag
and a tight chain add friction. `kG` does not compensate for this friction. The
usual symptom is a carriage that always stops a small distance below the
target.

## References

- [WPILib: Tuning an elevator position controller](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/tuning-elevator.html){:target="_blank"}
