---
title: How to Plan an Auto
parent: Autonomous
nav_order: 1
---

# How to Plan an Autonomous Routine
{: .no_toc }

<details open markdown="block">
  <summary>Contents</summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

The autonomous period is 15 seconds. Most autonomous routines that fail at a
competition do not fail because the code is incorrect. They fail because nobody
measured the duration of the routine, or found the actions that can operate at
the same time.

Use this page to do that work before you go to the field.

## How our routines are built

An autonomous routine in `robot/autoroutines.py` is a tree of commands. Three
components do almost all of the work:

| Component | Function |
|:----------|:---------|
| `SequentialCommandGroup` | Operates its contents one after the other |
| `ParallelCommandGroup` | Operates its contents at the same time. It is complete when all of them are complete |
| `WaitCommand(seconds)` | Does nothing for a given time |

`.withTimeout(seconds)` is also available on all commands. It stops the command
after that time.

This is a routine from the 2026 robot, with some steps removed:

```python
def steph_curry_auto(self):
    return SequentialCommandGroup(
        ParallelCommandGroup(
            self.robot.SLOW_LEFT_STEAL_DEPOT_FIRST,
            self.robot.coroutines.intake
        ),
        self.robot.coroutines.drive_to_zone_trench.withTimeout(2.9),
        ParallelCommandGroup(
            self.robot.SLOW_LEFT_STEAL_DEPOT_FIRST_SAFE,
            self.robot.coroutines.intake_2
        ),
        self.robot.coroutines.p1_over_left_bump_3bot,
    )
```

The structure shows the strategy. The robot drives a path *and* operates the
intake. Then it moves to a scoring position. Then it drives a second path *and*
operates the intake again. The intake does not wait for the drivetrain, and the
drivetrain does not wait for the intake.

{: .important }
> **An action that operates during a path is where the time comes from.** A
> routine that drives, stops, collects a piece, drives and stops again is
> slower than the same routine with the intake in a `ParallelCommandGroup`. If
> your routine is one second too long, examine this first.

## Two methods to move

- **A path** is a route through waypoints. Generate it in
  [PathPlanner](https://pathplanner.dev/){:target="_blank"} and load it by name,
  for example `self.robot.SLOW_LEFT_STEAL_OUT_PP`. Use a path for long
  movements.
- **A movement to a pose** commands the robot to one target position. A
  controller decreases the distance to the target. `drive_to_zone_trench` and
  the lineup on `RIGHT_BUMPER` both use this method. Use it for the last half
  metre, where a planned path cannot know that a game piece moved the robot.

Always give a movement to a pose a timeout. Without a timeout, a robot that
cannot reach the target continues to try for the remainder of the match.

## Exercise

The robot starts with one piece of fuel. Complete this sequence:

1. Shoot the first piece from a position inside the dashed ring.
2. Move to the LOAD zone in your alliance area.
3. Collect a second piece with the intake.
4. Shoot the second piece.

Score two pieces in less than 15 seconds. Do not touch barrier A or barrier B.

Three conditions make this an exercise and not a straight line:

- **The barriers are not in line.** The only route is below **A** and above
  **B**. A straight line to the goal hits **A**.
- **You shoot from a distance.** The dashed ring is 3 metres. This is smaller
  than a driver uses in teleop, because an autonomous shot must be repeatable.
  Shoot from the edge of the ring. If you drive to the goal, the routine is too
  long for the period.
- **The period is short.** A routine that stops to collect a piece, then
  drives, then stops to start the shooter, then drives, does not fit. Move
  those actions into the paths. This saves approximately two seconds.

To add a waypoint, select a step in the list, then click the field. To move a
waypoint, drag it. To delete a waypoint, right-click it. The green circle is
the start pose, and you can drag it. Press **Check routine** when the routine
is complete.

### The display

- The **timeline** below the field shows the full routine. Each block is one
  step. The width is the duration. Each colored dot is an action that operates
  during that step. The empty block on the right is the remainder of the 15
  seconds.
- The **robot** shows its actions. A bar across the back shows the intake. A
  ring shows the shooter speed. A dot in the center shows a piece of fuel.
- The **range ring** becomes brighter when the robot is close enough to shoot.
- A **collision** leaves a red robot at the position of contact.

### Parallel actions

A path or a movement to a pose can operate with more than one action. Click the
buttons on a step to select them. Select `Intake` for the path to the LOAD
zone. Select `Spin up` for the path to the goal. These become a
`ParallelCommandGroup` in the generated code.

{% include interactive/auto-planner.html title="Sketch an autonomous routine" %}

The generated Python is an initial version, not a complete routine. You must
still draw the paths in PathPlanner and give them names. Use this page to
answer two questions before you go to the field: does the routine fit in 15
seconds, and which actions can operate at the same time?

## Limits of this exercise

- **These are the only barriers.** The collision test uses the rectangular
  shape of the robot, with the corners. But a real field has many more objects.
- **Other robots move.** Your alliance partners drive their own routines
  through the same area. The opposing alliance also moves. Discuss your route
  with your alliance before a match.
- **The curve is not exact.** This page uses a spline through all the
  waypoints. PathPlanner uses control handles, thus the same waypoints give a
  different curve. Use this shape as an intention.
- **A game piece can be in a different position.** Every routine must operate
  correctly when a piece is not where you expect. Timeouts do this.

## References

- [Controls](../../Controls/controls)
- [PathPlanner documentation](https://pathplanner.dev/){:target="_blank"}
- [WPILib: Trajectory generation](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/trajectories/index.html){:target="_blank"}
