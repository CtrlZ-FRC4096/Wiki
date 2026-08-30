---
title: 2. Put the Steps in Order
parent: Tutorials
nav_order: 0.2
---

# Put the Steps in Order
{: .no_toc }

In the first 15 seconds of a match, no driver controls the robot. The robot
does a list of steps by itself. This is the autonomous period.

You write the list. The robot does the steps in the order you write them.

## Your task

Get the game piece into the goal.

You have five steps. Tap a step to add it to the routine. Use the arrows to
move a step. Use ✕ to remove it.

Then tap **Play** and watch.

{% include interactive/first-sequence.html title="Put the steps in order" %}

## What to look for

The robot cannot do two of these steps at the same time. Each step waits for
the one before it.

Think about what must be true before each step:

- The intake must be **down** before it can touch a game piece on the floor.
- The robot must be **holding** a game piece before it can shoot.
- The robot must be **near** the goal before a shot can go in.

More than one order works. The intake keeps running after you start it. You
can start it first, then drive to the game piece. A real routine does this. It
starts the intake and drives through the piece, because that is faster than
stopping to collect.

If a step happens too early, watch what the robot does. It does not stop and
tell you. It carries on and fails.

## Why the order is the whole job

Every autonomous routine on our robot is a list like this one. The list is
longer, and some steps happen at the same time as others, but the idea does not
change.

When you are ready for the full version, see
[How to Plan an Auto](../../Autonomous/planning-an-auto).

## Next

- [3. Teach the Robot to Decide](../first-rule)
