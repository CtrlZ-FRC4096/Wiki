---
title: Challenges
parent: Code
nav_order: 8
---

# Challenges
{: .no_toc }

Each tutorial teaches one idea. Each challenge uses more than one idea.

Each challenge is a problem that this team had on a robot. In each challenge,
the obvious answer passes the simple case and fails other cases. The same
thing occurs on a robot: code that operates correctly in the shop can fail
during a match.

Before you start a challenge, do the [tutorials](../../Tutorials/tutorials).
You must be able to write Python without help.

## The challenges

| Challenge | Subject |
|:----------|:--------|
| [Find the game piece with the motor current](../jam-detector) | A noisy signal, on robots that are all different |
| [Shoot while you are moving](../shoot-on-the-fly) | A calculation that uses its own result |
| [Use camera measurements that arrive late](../vision-latency) | Measurements that arrive late, and some that are incorrect |
| [Drive straight while you spin](../second-order-swerve) | Mathematics that is correct for one instant, but not for a full period |

## How the checks operate

Each challenge operates your code on a set of runs. Some runs find answers
that operate only on the simple case. Your code must pass all the runs.

When a check fails, its message tells you what the robot did. For example, it
gives the time when the robot stopped and the position of the game piece. Use
this data to find the cause of the failure.

{: .note }
> If you cannot find a solution, use the hints. The hints start with the
> general method and end near the code. Each page also has a section, "Why the
> obvious answers fail", that compares possible answers with measurements.
