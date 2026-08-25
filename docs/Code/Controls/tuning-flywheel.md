---
title: How to Tune a Flywheel
parent: Controls
nav_order: 3
---

# How to Tune a Shooter Flywheel
{: .no_toc }

<details open markdown="block">
  <summary>Contents</summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

Read [How to Tune a Controller](../tuning) first. That page gives the function
of each gain and the sequence to use. This page gives the procedure for a
flywheel.

## Properties of a flywheel

A flywheel uses **velocity** control. The position of the wheel is not
important. Only the speed is important, and the speed must be the same for
each shot. Two conditions follow from this:

- There is no motion profile. The target speed is a constant. Therefore `kA`
  has no function after the wheel is at speed.
- The target does not move. Therefore `kD` has no function. On a flywheel,
  `kD` is almost always 0.

`kV` and `kP` do almost all of the work.

The flywheel in the simulator has a 1:1 gear ratio to a motor. The motor turns
at **50 rotations per second** (3000 RPM) with no load and a full battery. The
wheel has sufficient mass to need approximately two seconds to reach speed.

The velocity signal has a filter. Therefore the signal is late by a few
milliseconds. This delay limits the maximum `kP`.

## Procedure

**1. Set all the gains to 0.** Press **All gains to zero**. There is no voltage
and no movement. This is the initial condition.

**2. Find `kV`.** `kV` is volts for each rotation per second. Calculate the
value: 12 volts turn this wheel at 50 rps, thus 1 rps needs approximately
`12 / 50` volts. Set `kV` to that value. Press **Tune kV**. The wheel now moves
to almost the target speed with feedforward only.

**3. Increase `kP` until the wheel recovers from the ball.** At 5 seconds a
ball moves up the feed chute, touches the wheel and is released. Look at two
things: the decrease of speed in the plot, and the position where the ball
lands.

{: .important }
> The goal accepts a shot only if the speed is within approximately 5% of the
> target. If the speed is too low, the ball stops before the goal. If the
> speed is too high, the ball goes past the goal. Both conditions are a miss.
> A wheel that is 20% too fast is as incorrect as a wheel that is 20% too slow.

With `kP` at 0, feedforward does not detect the ball. The wheel returns to
speed slowly. Increase `kP` and the wheel recovers more quickly.

**4. Find the value of `kP` that causes oscillation.** Continue to increase
`kP`. Above approximately 6, the wheel moves above and below the target instead
of holding it. The late velocity signal causes this oscillation. Record the
value, then decrease `kP` to approximately one half of it.

**5. Keep `kI` and `kD` at 0.** Increase `kI` one time to see the result. The
wheel goes above the target speed and needs a long time to return. This
condition is integral windup. Set `kI` back to 0.

{% include interactive/pid-sim.html plant="flywheel" title="Shooter flywheel — velocity control" %}

<details markdown="block">
  <summary>Show a reasonable answer</summary>

`kV` is approximately 0.24. `kP` is approximately 1.5. `kI` and `kD` are 0.

`kP` has a large acceptable range. Values from approximately 0.5 to 6 pass the
checks. `kV` has a small acceptable range, because `kV` alone sets the speed
when the feedback gains are 0.

On the robot the configuration is:

```python
config.slot0.k_v = 0.24
config.slot0.k_p = 1.5
config.slot0.k_i = 0.0
config.slot0.k_d = 0.0
```

</details>

## On the robot

Values from a simulation are an initial condition, not a result. A real shooter
has friction that changes as the mechanism becomes warm. The battery voltage
decreases when the drivetrain uses current. The surface of the wheel becomes
worn.

Tune the flywheel again after any of these conditions change. Test the tuning
at all the speeds that you use.

{: .warning }
> Make sure that the wheel returns to full speed between shots. If it does not,
> the second game piece goes to a different position than the first. When you
> examine a tuning, look at the recovery after the disturbance. The recovery is
> more important than the initial increase to speed.

## References

- [WPILib: Tuning a flywheel velocity controller](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/tuning-flywheel.html){:target="_blank"}
