---
title: How to Tune a Controller
parent: Controls
nav_order: 2
---

# How to Tune a Controller
{: .no_toc }

<details open markdown="block">
  <summary>Contents</summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

Many mechanisms on the robot must move to a value. A shooter speed, an arm
angle and an elevator height are examples. A controller moves each mechanism to
its value.

To tune a controller, select a small set of constants. Correct constants make
the mechanism move to the target quickly. The mechanism then stops at the
target and stays there.

This page gives the method. The three pages after it let you do the method on a
simulated mechanism in your browser. The simulators use the same units and the
same sequence as the robot.

- [How to Tune a Flywheel](../tuning-flywheel) — velocity control
- [How to Tune an Arm](../tuning-arm) — position control against gravity
- [How to Tune an Elevator](../tuning-elevator) — position control, constant gravity

## Feedforward and feedback

There are two methods to calculate the voltage for a motor. A good controller
uses both methods.

**Feedforward** calculates the voltage from physics, before an error occurs. If
a flywheel needs 9.6 volts to hold 40 rotations per second, send 9.6 volts.
Feedforward does not use a sensor. Feedforward does most of the work, and it
does the work immediately.

But feedforward knows only the robot that you describe to it. It cannot detect
a ball that hits the flywheel. It cannot detect a low battery or a tight chain.

**Feedback** measures the difference between the target and the actual value.
This difference is the error. Feedback applies a voltage to decrease the error.
Feedback corrects the conditions that feedforward cannot predict.

Feedback always operates after an error occurs. Therefore a mechanism with
feedback only is usually late, or low, or unstable.

> Feedforward does most of the work. Feedback corrects the remainder.

## The gains

We use Phoenix 6. These are the names in a `slot0` configuration in the robot
code. All the values are in volts.

| Gain | Multiplied by | Compensates for |
|:-----|:--------------|:----------------|
| `kS` | the direction of movement | Static friction. The voltage to make the mechanism start to move |
| `kG` | 1, or the cosine of an arm angle | Gravity. The voltage to hold the mechanism against its own weight |
| `kV` | the target velocity | Back-EMF. The voltage to keep a given speed |
| `kA` | the target acceleration | Inertia. The additional voltage to increase or decrease the speed |
| `kP` | the present error | All the conditions that feedforward does not correct. This is the primary feedback gain |
| `kI` | the accumulated error | A constant offset that does not decrease |
| `kD` | the rate of change of the error | Damping. This gain decreases the overshoot |

`kS`, `kG`, `kV` and `kA` are feedforward gains. `kP`, `kI` and `kD` are
feedback gains. Together, the three feedback gains are a PID controller.

{: .note }
> `kV` and `kA` are properties of the mechanism. They are not preferences. On
> the robot, measure them with
> [SysId](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/system-identification/introduction.html){:target="_blank"}.
> SysId moves the mechanism through a known sequence and calculates the values.
> Do not estimate `kV` and `kA` from a plot. A low `kV` and a high `kA` give
> almost the same plot.

## Motion profiles

Do not command an arm to move from 0° to 90° immediately. That command
requests an infinite speed. The controller then applies the maximum voltage,
and the arm overshoots.

Command a **motion profile** instead. A motion profile is a sequence of
positions and velocities with a speed limit and an acceleration limit. Phoenix
6 calls this Motion Magic. WPILib calls it a `TrapezoidProfile`.

A motion profile also makes `kV` and `kA` useful for a position controller.
Without a profile, the commanded velocity is 0 or infinite. Then `kV` has no
correct value to multiply.

## The sequence

Tune the gains in this sequence. If you use a different sequence, a large `kP`
can hide an incorrect `kV`. The mechanism then operates correctly at the speed
that you test, and incorrectly at other speeds.

1. Set all the gains to 0. Look at the mechanism with no control.
2. **Tune `kG` first**, if gravity applies a load to the mechanism. Switch off
   the feedback gains. Increase `kG` until the mechanism holds its position.
   Do this at the worst position. For an arm, the worst position is horizontal.
3. **Tune `kS` next**, if the mechanism has high friction. Increase `kS` until
   the mechanism starts to move.
4. **Tune `kV` next.** Keep the feedback gains at 0. Command a slow movement.
   Increase `kV` until the mechanism keeps the commanded speed. If `kV` is too
   low, the mechanism is late. If `kV` is too high, the mechanism is early.
5. **Set `kA`** to the measured value, if you have one. `kA` is most important
   for a heavy mechanism with a fast profile.
6. **Tune `kP` next.** Increase `kP` until the mechanism moves quickly to a new
   target. Then continue to increase `kP` until the mechanism oscillates.
   Record that value. Then decrease `kP` to approximately one half of it.
7. **Tune `kD`**, if the mechanism continues to overshoot. Increase `kD` in
   small steps. Too much `kD` increases the sensor noise and makes the motor
   vibrate.
8. **Do not use `kI`.** Use `kI` only if the mechanism always stops a small
   distance before the target and no other gain corrects this. `kI` accumulates
   and causes overshoot. A missing `kG` or `kS` is the more usual cause.

## How to isolate one gain

A large `kP` moves the mechanism to the target even when `kG` and `kV` are
incorrect. Therefore an incorrect gain can stay hidden.

Each simulator has an **Isolate** control. It sets the mechanism to a condition
that shows one gain.

| Button | Function |
|:-------|:---------|
| **Full loop** | All the gains operate. This is the mechanism in normal use |
| **Tune kG** | Holds the mechanism at the position of maximum gravity load. All the other gains are 0. Only `kG` holds the mechanism |
| **Tune kV** | Commands a slow movement with the feedback gains at 0. Only the feedforward gains keep the mechanism on the setpoint line |

Each mode holds the other sliders at 0 and makes them grey. Each mode also uses
the same conditions as its related check. What you see is what the check
measures.

{: .note }
> The angles on these pages use the Phoenix 6 convention. `kG` is multiplied by
> the **cosine** of the arm position. Therefore **0° is horizontal**, and this
> is the angle of maximum gravity load. **Tune kG** holds the arm at 0°. If
> your mechanism has its zero at the vertical position, the same physical
> angle is 90° in your values. The gain does not change.

## When the mechanism is tuned

Before you use a mechanism in a match, make sure that all these conditions are
correct:

- The mechanism moves to the target at **all the setpoints that you use**. Do
  not test one setpoint only.
- The mechanism **holds** the target. It does not move or vibrate.
- The mechanism **recovers** from a disturbance in approximately one second. A
  game piece or another robot can cause a disturbance.
- The overshoot is small. The mechanism does not touch other parts.
- The commanded voltage is less than 12 V for most of the movement. A motor at
  12 V has no additional voltage for feedback.

## Limits of a simulation

A real mechanism has conditions that a simulation does not show. These are
some examples:

- Backlash in the gearbox.
- Flexure in the structure.
- A chain that becomes longer during a season.
- A battery voltage that decreases under load.

Tune the mechanism again after you change it. Record the gains in a file, not
in a commit message.

## References

- [WPILib: Introduction to controls tuning](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/tuning-introduction.html){:target="_blank"} — the source for these simulators
- [WPILib: Introduction to PID](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/introduction-to-pid.html){:target="_blank"}
- [WPILib: Introduction to feedforward](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/introduction/introduction-to-feedforward.html){:target="_blank"}
- [CTRE Phoenix 6: closed-loop control](https://v6.docs.ctr-electronics.com/en/stable/docs/api-reference/device-specific/talonfx/closed-loop-requests.html){:target="_blank"}
