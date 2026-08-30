---
title: 2. Shoot While You Are Moving
parent: Challenges
nav_order: 2
---

# Shoot While You Are Moving
{: .no_toc }

A robot that stops to shoot wastes the match. Stopping costs a second to slow
down, a second to aim and a second to get going again. Do that ten times and
you have given away half the match.

So shoot while you drive. This is one of the hardest things a good team does,
and the reason is not the mechanism. It is the maths.

## The game piece keeps your speed

Throw a ball from a moving truck and it does not go where you threw it. It goes
where you threw it **plus** where the truck was going. A game piece leaving a
robot at 6 m/s, from a robot driving at 3 m/s, travels at 9 m/s over the ground.

A shot can be in the air for over a second. A robot at 4 m/s covers four metres
in that time. So the correction is not small. It is bigger than the goal.

## Aim where the goal will be

The trick is to aim at a **different place** than the goal. Pick the point that
puts the goal under the game piece when it comes down. That point is the goal,
moved back by however far the robot travels while the piece is in the air:

```
aim_point = goal - robot_velocity * flight_time
```

Now read that line again and find the problem.

## The answer depends on itself

`flight_time` comes from the shot table, and you look up the shot table **by
distance**. Which distance? The distance to the aim point. Which you do not
have yet, because you need the flight time to work it out.

This is a **fixed point**: a value that appears on both sides of its own
equation. You cannot rearrange your way out of it. What you do instead is guess,
work out the answer, and use that answer as the next guess:

1. Guess: the distance to the real goal.
2. Look up the flight time for that distance.
3. Work out the aim point, and its distance.
4. That distance is a better guess. Go back to step 2.

Each round is closer than the last. Stop when the number stops moving.

## The task

{% include interactive/python-exercise.html id="shoot_on_the_fly" %}

## Why the obvious answers fail

`tools/validate-shoot.py` measures every one of these against the nine cases:

| Answer | Worst miss | Cases scored |
|:-------|:-----------|:-------------|
| Aim straight at the goal | 4.69 m | 1 of 9 |
| Correct once | 1.40 m | 2 of 9 |
| Correct twice | 0.37 m | 6 of 9 |
| Correct three times | 0.10 m | 9 of 9 |
| Correct four times | 0.03 m | 9 of 9 |

One correction is not a small error. It is 1.4 m, a miss by a whole robot. The
first correction uses the flight time for the **wrong** distance. At these
speeds the wrong distance is metres out.

Do not write "correct three times" in your code. Write "correct until it stops
changing", and stop after a fixed number of rounds whatever happens. A robot
that waits for a number that never settles has stopped being a robot.

{: .note }
> This is real. `shot_calc.py` on the 2026 robot solves the same problem with a
> numerical optimiser and drag and Magnus effect, and writes the answers into a
> lookup table. `lookup_table.py` returns a time of flight for exactly this
> reason.

## Next

- [Trust a camera that tells you the past](../vision-latency)
