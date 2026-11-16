---
title: 2. Shoot While You Are Moving
parent: Challenges
nav_order: 2
---

# Shoot While You Are Moving
{: .no_toc }

If a robot stops to shoot, it loses time. The robot needs approximately one
second to stop, one second to aim, and one second to start again. Ten shots
then cost approximately 30 seconds of the match.

Thus, a good robot shoots while it moves. The difficult part is not the
mechanism. The difficult part is the calculation.

## The game piece keeps the velocity of the robot

When a game piece leaves a moving robot, the velocity of the robot adds to the
velocity of the shot. The shooter gives a game piece 6 m/s. If the robot moves
at 3 m/s in the same direction, the game piece moves at 9 m/s relative to the
field.

A shot can be in the air for more than one second. In one second, a robot at
4 m/s moves 4 m. Thus, the necessary correction is large. It is larger than the
goal.

## Aim at a different point

Do not aim at the goal. Aim at a different point, so that the game piece lands
in the goal. This aim point is the goal, moved back by the distance that the
robot moves while the game piece is in the air:

```
aim_point = goal - robot_velocity * flight_time
```

## The calculation uses its own result

You get `flight_time` from the shot table. To use the shot table, you must know
the distance to the aim point. But to calculate the aim point, you must know
`flight_time`.

A value that is on the two sides of its own equation is a **fixed point**. You
cannot solve this equation directly. Do these steps instead:

1. Use the distance to the goal as the first estimate.
2. Find the flight time for that distance.
3. Calculate the aim point, and the distance to it.
4. Use that distance as the new estimate. Then, do step 2 again.

Each estimate is nearer to the correct value than the previous estimate. Stop
when the distance does not change.

## The task

{% include interactive/python-exercise.html id="shoot_on_the_fly" %}

## Why the obvious answers fail

`tools/validate-shoot.py` tests each of these answers on the nine cases:

| Answer | Largest miss | Cases scored |
|:-------|:-------------|:-------------|
| Aim at the goal | 4.69 m | 1 of 9 |
| Correct one time | 1.40 m | 2 of 9 |
| Correct two times | 0.37 m | 6 of 9 |
| Correct three times | 0.10 m | 9 of 9 |
| Correct four times | 0.03 m | 9 of 9 |

One correction gives an error of 1.40 m, which is approximately the length of a
robot. The first correction uses the flight time for an incorrect distance. At
these speeds, that distance is incorrect by more than 1 m.

Do not do the correction a fixed number of times. Do the correction until the
distance does not change. Also, set a maximum number of rounds. If the distance
does not stop changing, the robot must continue to operate.

{: .note }
> This problem also occurs on our robot. In 2026, `shot_calc.py` solves the same
> problem with a numerical optimizer, and includes drag and the Magnus effect.
> It writes the results in a lookup table. For this reason, `lookup_table.py`
> gives a time of flight.

## Next

- [Use camera measurements that arrive late](../vision-latency)
