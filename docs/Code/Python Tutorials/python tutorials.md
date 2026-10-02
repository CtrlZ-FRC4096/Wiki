---
title: Python Tutorials
parent: Code
nav_order: 1.5
---

# Python Tutorials

Learn the Python used in our robot code, one small piece at a time. Each lesson has a short summary, an example from our real code, and graded exercises that run in your browser.

## How to do the lessons

1. Read the summary.
2. Look at the example from our robot code.
3. Do the exercises.
4. Do the lessons in order. Each lesson takes about 15 to 30 minutes.

## How the exercises work

- Press **Run checks** (or Ctrl+Enter). The page runs your code in the browser. Nothing leaves your computer.
- Each exercise has a list of checks. A check shows ✓ when your code passes it and ✗ with a message when it does not.
- Pass every check before you move on.
- The **Hint** button shows one hint at a time.
- The **Show solution** button asks for the team password. A mentor has it.
- Your work is saved on this computer, even if you leave the page.

{: .note }
The robot libraries (WPILib, REV, Phoenix) are not available in the browser. This is why the exercises use plain Python and fake motors.

## The lessons

| # | Lesson | Used in |
|---|--------|---------|
| 1 | Variables and Types | `const.py`, flags in `robot.py` |
| 2 | Conditionals and Logic | state machines, `intake.py` `periodic()` |
| 3 | Lists and Loops | `for subsystem in self.subsystems` |
| 4 | Functions | `get_motor_config()`, `shot_calc.py` |
| 5 | Classes and Objects | every file in `robot/subsystems/` |
| 6 | RobotPy Patterns | `@button.whenPressed`, lambdas, `yield` in `oi.py` |
