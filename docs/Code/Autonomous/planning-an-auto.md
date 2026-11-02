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

The autonomous period is 20 seconds. Most autonomous routines that fail at a
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

The robot starts with one piece of fuel. It can hold one piece at a time.
Complete this sequence:

1. Shoot the first piece from a position inside the dashed ring.
2. Move to the LOAD zone in your alliance area.
3. Collect a second piece with the intake.
4. Shoot the second piece.

Score two pieces in less than 20 seconds. Do not touch barrier A or barrier B.
The routine must work in at least 18 of 20 matches.

**Stretch goal:** do steps 2 to 4 again for a third piece, still in less than
20 seconds and still in 18 of 20 matches. This is difficult. It needs a
routine that never stops when it does not have to, and limits as high as they
can be while the routine still works.

Four conditions make this an exercise and not a straight line:

- **The barriers are not in line.** The only route is below **A** and above
  **B**, every trip. A straight line to the goal hits **A**.
- **You shoot from a distance.** The dashed ring is 3 metres. This is smaller
  than a driver uses in teleop, because an autonomous shot must be repeatable.
  Shoot from the edge of the ring. If you drive to the goal, the routine is too
  long for the period.
- **The period is short.** Two pieces fit easily. But a routine that stops to
  collect a piece, then drives, then stops to start the shooter, then drives,
  has no time left for a third. Move those actions into the paths.
- **The robot is not the plan.** A faster plan is shorter on paper. On carpet,
  a plan that asks for too much makes the wheels slip, the robot lose track
  of where it is, and the shots miss. The next section explains why.

To add a waypoint, select a step in the list, then click the field. To move a
waypoint, drag it. To delete a waypoint, right-click it. Press **Check
routine** when the routine is complete.

The green START marker is the start pose. It is part of the task, the same as a
starting position in a match. You cannot move it.

### Max speed and max acceleration

Every PathPlanner path has a max speed and a max acceleration. The planner
uses them to make the plan: how fast the robot goes at each point on the path,
and when it gets there. Higher limits make a shorter plan. But the plan is
only what the code asks for. The robot on the carpet does what physics lets
it do. This page simulates that physics, with ideas from
[maple-sim](https://github.com/Shenzhen-Robotics-Alliance/maple-sim){:target="_blank"},
a physics simulator for FRC robots.

**The wheels can only grip so hard.** Friction between the wheels and the
carpet is what pushes the robot. That force is the friction coefficient times
the weight of the robot, so the most the robot can accelerate is the friction
coefficient times *g*. maple-sim gives Colson wheels a coefficient of 0.9, so
the limit is about 0.9 × 9.81 ≈ 8.8 m/s². Speeding up, slowing down and turning
all use this same grip. A turn of radius *r* at speed *v* needs *v*²/*r*. The
planner slows the robot in a curve so the turn needs no more than max
acceleration. But speeding up or slowing down in the curve adds to it. Ask
for more than the grip and the wheels **slip**: they spin faster than the
robot moves, and the robot slides wide of the path.

**The motors have a top speed.** The drive motors reach 4.75 m/s at most, and
they have less acceleration to give as they get near it. A max speed above
4.75 m/s is a plan the robot cannot follow. It falls behind. The path follower
steers toward where the plan says the robot should be, so a robot that is
behind cuts the corners. When the path ends, the robot is still moving.

**The robot works out where it is.** Odometry counts how far each wheel turns.
A slipping wheel turns more than the robot moves, and odometry cannot tell the
difference, so the estimate drifts away from the real position. A camera that
sees an AprilTag corrects the estimate. The robot code blends the two the way
WPILib's `SwerveDrivePoseEstimator` does: a reading it trusts more moves the
estimate more. A tag far away gives a noisier reading. A robot that moves fast
blurs the picture: at 4 m/s, only a tag less than about 2 m away gives a
reading clear enough to use. The middle of the field has no tag in range.

**Everything uses the estimate.** The path follower steers by where the robot
*thinks* it is. The shooter aims from where the robot thinks it is. An
estimate that is 30 cm wrong puts the real robot 30 cm off the path, and the
shot 30 cm off the goal. A shot taken while the robot is still moving is
carried off line by the speed of the robot.

**No two matches are the same.** The carpet, the wear on the treads and the
battery change the grip a little from match to match. The camera noise is
different every time. So the page runs your routine as 20 matches. A routine
that works once is not a routine you can use at a competition. It must work in
at least 18 of the 20.

This gives you a balance to find:

| Limits | Two pieces | Three pieces (stretch) |
|:-------|:-----------|:-----------------------|
| Too low | Works in every match, with time to spare | Does not finish in 20 seconds |
| Balanced | Works in almost every match | Works in almost every match, just inside 20 seconds |
| Too high | The wheels slip and the robot falls behind. It touches barriers and misses shots in some matches, and the number of those matches increases quickly | The same |

Start with low limits and a routine that scores two pieces. Then increase the
limits a little at a time, and press **Check routine** after each change. Stop
when matches start to fail. Then decrease the limits a little. For the stretch
goal, you need to find the exact top of the balance.

### The display

- The **timeline** below the field shows the full routine. Each block is one
  step. The width is the duration. Each colored dot is an action that operates
  during that step. The empty block on the right is the remainder of the 20
  seconds.
- The **robot** is where the robot really is. It shows its actions. A bar
  across the back shows the intake. A ring shows the shooter speed. A dot in
  the center shows a piece of fuel.
- The **orange outline** is where the plan says the robot should be now. A
  dashed line joins it to the robot when the robot falls behind.
- The **dashed blue outline** is where the robot thinks it is. It moves away
  from the robot when odometry drifts.
- A **red ring** round the robot means its wheels are slipping now.
- The **chips** under the field show the time, the fuel, the shooter, the
  score, how much of the grip the robot uses, what the camera sees, and how far
  the robot's estimate is from where it really is.
- The **white line** is where the robot really went. It is **red** where the
  wheels slipped.
- The **small squares** are AprilTags. A line from a tag to the robot shows
  the camera reading it. A faint dashed line shows a tag in view that is too
  blurred to use. The small dots are recent readings.
- The **chart** below the timeline has three rows. **Speed** compares the plan
  (dashed orange) with the robot (blue), against the top speed of the motors.
  **Grip used** shows how much of the grip of the wheels the robot asks for.
  Above the dashed red line, the wheels slip. **Pose error** shows how far the
  estimate is from the real position, with a tick for each camera reading. Red
  bands are where the wheels slipped. Drag on the chart to move through the
  match.
- The **20 matches** are under the chart. Green worked, red failed. Click one
  to watch it. The text below says what happened in it.
- The **range ring** becomes brighter when the robot is close enough to shoot.
- A **collision** leaves a red robot at the position of contact.

### Parallel actions

A path or a movement to a pose can operate with more than one action. Click the
buttons on a step to select them. Select `Intake` for the path to the LOAD
zone. Select `Spin up` for the path to the goal. These become a
`ParallelCommandGroup` in the generated code.

{% include interactive/auto-planner.html title="Sketch an autonomous routine" %}

The generated Python is an initial version, not a complete routine. You must
still draw the paths in PathPlanner and give them names, with the max speed
and max acceleration you found. Use this page to answer three questions
before you go to the field: does the routine fit in 20 seconds, which actions
can operate at the same time, and how hard can the robot drive before it
stops being reliable?

## Limits of this exercise

- **The physics is simplified.** The robot does not rotate under physics, it
  does not hit other robots, and all four wheels share one grip. The numbers
  are typical for an FRC swerve robot, not measured on ours. Find the real
  limits on the real robot, on carpet, with a full battery and a used one.
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
- [maple-sim](https://github.com/Shenzhen-Robotics-Alliance/maple-sim){:target="_blank"}:
  the physics simulator the slipping on this page is modelled on
- [WPILib: Pose estimators](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/state-space/state-space-pose-estimators.html){:target="_blank"}
- [WPILib: Trajectory generation](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/trajectories/index.html){:target="_blank"}
