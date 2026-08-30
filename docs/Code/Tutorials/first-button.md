---
title: 1. Give a Button a Job
parent: Tutorials
nav_order: 0.1
---

# Give a Button a Job
{: .no_toc }

This is the first tutorial. You do not need to know how to write code. You do
not need a computer. A phone is enough.

## What a robot does

A robot does what you tell it. It does nothing else.

A driver holds a controller. The controller has buttons. Your job is to decide
what each button does.

## Two ways a button can work

There are two ways to connect a button to a job.

| Choice | What happens |
|:-------|:-------------|
| **While I hold it** | The job starts when you press the button. It stops when you let go |
| **Once when I press it** | The job starts when you press the button. Nothing stops it |

Both are correct for some jobs. Only one is correct for an intake.

## Your tasks

There are three. Do them in order. The widget shows which one you are on.

**Task 1.** Make the intake run while you hold the left trigger. It must stop
when you let go.

1. Tap **Left trigger**.
2. For **Do this**, tap **Run the intake**.
3. For **And do it**, tap **While I hold it**.
4. Press and hold the **Left trigger** pad. Watch the roller turn.
5. Let go. The roller must stop.
6. Tap **Check my answer**.

**Task 2.** Make the A button start the shooter. A shooter needs about a second
to reach speed, thus the driver must not hold a button for the whole match.
Use **Once when I press it**.

**Task 3.** The shooter now has no way to stop. Give the B button the job
**Stop the shooter**.

Task 3 is the important one. An action that starts with **Once when I press
it** needs a second button to undo it. **While I hold it** writes both halves
for you.

{% include interactive/first-bindings.html title="Give a button a job" %}

## Try the wrong answer

Change **And do it** to **Once when I press it**. Then press the pad and let
go.

The roller does not stop. A message tells you that the intake is still running.

Nothing is broken. The robot did exactly what you told it. You told it to start
the intake and you never told it to stop.

{: .important }
> This is the most frequent error in `oi.py`. A job that must stop needs two
> instructions: one to start it, and one to stop it. **While I hold it** writes
> both for you.

## Next

- [2. Put the Steps in Order](../first-sequence)
