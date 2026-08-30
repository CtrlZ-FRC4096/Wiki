---
title: 3. Teach the Robot to Decide
parent: Tutorials
nav_order: 0.3
---

# Teach the Robot to Decide
{: .no_toc }

Until now you told the robot exactly what to do and when. In a match that is
not enough. The robot must decide some things for itself.

A robot decides with a **sensor** and a **rule**.

## The sensor

The intake has a sensor. It measures the distance to the game piece in
centimetres.

| Reading | Meaning |
|:--------|:--------|
| 40 cm | The intake is empty |
| 18 cm | The game piece is inside the robot |
| 5 cm | The game piece is jammed against the back |

The reading gets smaller as the game piece comes in. Watch the bar move while
the robot collects.

## The rule

A rule has three parts:

**IF** something is true, **THEN** do this.

## Your task

Stop the intake when the game piece is inside the robot.

1. For **IF**, tap **the intake sensor**.
2. For **IS**, tap **below**.
3. Move the slider to a value.
4. For **THEN**, tap **stop the intake**.
5. Tap **Play**.

{% include interactive/first-rule.html title="Teach the robot to decide" %}

## Find the correct value

The value on the slider decides everything.

- **Too large.** The rule happens while the game piece is still outside. The
  intake stops too early and the piece does not come in.
- **Too small.** The rule never happens in time. The intake keeps pulling and
  the game piece jams.

There is a range of values that work. Find one end of the range, then the
other, then use a value in the middle. This is how you tune anything on a
robot.

{: .note }
> Try **the battery voltage** instead of the intake sensor. The rule never
> happens, because the battery voltage does not change when a game piece
> arrives. A rule is only as good as the sensor you give it.

## What you have learned

You have now done the three things that all robot code does:

1. **A button makes something happen.** That is the driver.
2. **Steps happen in an order.** That is autonomous.
3. **A sensor decides.** That is everything else.

## Next

Everything after this is the same three ideas with more detail. The next
tutorial writes real Python, a few lines at a time.

- [Joystick Deadbands](../joystick-deadband)
