---
title: Challenges
parent: Code
nav_order: 8
---

# Challenges
{: .no_toc }

The tutorials teach one idea at a time. These do not.

Each challenge here is a problem this team has actually had to solve. The
obvious answer to every one of them passes the case you can see and fails the
cases you cannot. That is the point. A robot works in the shop and then loses a
match, and the difference is always one of these.

You need to have finished the [tutorials](../../Tutorials/tutorials) first. You
also need to be able to write Python without help.

## The challenges

| Challenge | What it is really about |
|:----------|:------------------------|
| [Find the game piece with the motor current](../jam-detector) | A signal that is never clean, on a robot that is never the same twice |
| [Shoot while you are moving](../shoot-on-the-fly) | An answer that depends on itself |
| [Trust a camera that tells you the past](../vision-latency) | Measurements that arrive late, and some that are wrong |
| [Drive straight while you spin](../second-order-swerve) | The maths that is right for an instant and wrong for a period |

## How they are graded

Every challenge runs your code against a set of runs. Some of the runs are
there to catch an answer that only works on the easy case. You have to pass all
of them.

The checks tell you what the robot did, not only that you failed. Read them.
A check names the moment it stopped and where the game piece was. That tells
you which way to move.

{: .note }
> These are hard. Getting one wrong twenty times is normal. If you are stuck,
> the hints are there, and each page ends with the reason the obvious answer
> fails.
