---
title: Python Tutorials
parent: Code
nav_order: 1.5
---

# Python Tutorials

Learn the Python used in our robot code, one small piece at a time. Each lesson has a short summary, an example from our real code, and exercises you run in your browser.

## How to do the lessons

1. Read the summary.
2. Look at the example from our real code.
3. Do the exercises in the embedded runners.
4. Do the lessons in order. Each lesson takes about 15 to 30 minutes.

For every exercise:

- The starter code has comments that say `FIX THIS` or `YOUR CODE HERE`.
- At the bottom there is a test section marked **do not change**. It checks your work and prints one `PASS` or `FAIL` line per test, plus a score like `SCORE: 3/3`.
- Your goal for every exercise: every line prints **PASS**.
- Stuck after a few tries? Open the **Hint**. Still stuck? Open the **Solution**, read it, close it, and write it yourself.
- A starter always runs without a crash. Before you fix it, all or most tests print FAIL. That is normal.

## The code runner

The runner on each page runs real Python in your browser. Your code stays on your computer.

- Press **Run** (or Ctrl+Enter) to run the code. The output shows in the dark pane.
- Press **Reset code** to get the starter code back.
- The first run on a page downloads the Python interpreter (about 10 MB). Later runs start at once.
- An error prints a traceback. Read the last line first. It names the problem and the line number.

{: .note }
The runner needs the internet for the first load on each computer. The robot libraries (WPILib, REV, Phoenix) are not in the runner. This is why the exercises use plain Python and fake motors.

## The lessons

| # | Lesson | Used in |
|---|--------|---------|
| 1 | Variables and Types | `const.py`, flags in `robot.py` |
| 2 | Conditionals and Logic | state machines, `intake.py` `periodic()` |
| 3 | Lists and Loops | `for subsystem in self.subsystems` |
| 4 | Functions | `get_motor_config()`, `shot_calc.py` |
| 5 | Classes and Objects | every file in `robot/subsystems/` |
| 6 | RobotPy Patterns | `@button.whenPressed`, lambdas, `yield` in `oi.py` |
