---
title: 6. RobotPy Patterns
parent: Python Tutorials
nav_order: 6
---

# 6. RobotPy Patterns

Three parts of Python that normal tutorials skip, but our code uses everywhere: lambdas, button decorators, and `yield`.

## Summary

### Lambdas: read the value again later

```python
Button(lambda: self.robot.rumble_d1)
```

`lambda: expr` is a small function without a name. It is the same as:

```python
def nameless():
    return self.robot.rumble_d1
```

Why the lambda? `Button(self.robot.rumble_d1)` would freeze the startup value forever. `Button(lambda: self.robot.rumble_d1)` hands over a function, and the button calls it every frame. It always reads the **current** value.

### Decorators: register a function

```python
@self.driver1.POV.DOWN.whenPressed
def _():
    self.robot.poseEstimator.set_yaw(0.0)
```

When Python executes the function definition, `@x` calls `x(your_function)`. The team button decorator creates and binds a command. The scheduler runs the command when the driver presses the button. In this example, driver 1 POV DOWN resets yaw. The A button has a different heading binding.

Two details you will see in `oi.py`:

- The function is named `_` on purpose. It means: only the decorator uses this name.
- The team `whenHeld` wrapper uses `whileTrue`: a press schedules the command, and a release cancels it if it is active. A completed command does not restart while the button remains held.
- A normal function bound with `whenHeld` runs once. Repeated work needs a generator that continues to yield.
- `whenReleased` schedules its command when the button changes from pressed to released.

### Coroutines: a command as a timeline

A function with `yield` inside is a **generator**. Its lifecycle:

1. You call it. Nothing runs yet. You get a generator object.
2. Each time the scheduler steps it, the function runs up to the next `yield`, then pauses there.
3. When the function returns, the scheduler removes the command.

```python
@self.rumble_button_d1.whenPressed
def _():
    timer = Timer()
    timer.start()
    self.driver1.setRumble(1)
    while not timer.hasElapsed(0.5):
        yield            # stop here, continue next frame
    self.driver1.setRumble(0)
```

"Rumble for half a second" reads top to bottom, and the robot keeps driving during the wait. Many of our command bodies are `while True: ... yield`: do some work, wait a frame, repeat forever (the drivetrain default command is built this way).

{: .note }
Do not use `time.sleep()` in a command callback or generator on the robot main loop. It blocks other work. Use `yield` to return control to the scheduler. Use a timer to measure elapsed time.

## Try it

{% include interactive/python-exercise.html id="py6_try" %}

## Tools for these exercises

For exercise 6.1, a conditional expression selects one result:

```python
status = lambda: 'spinning' if motor_speed > 0.1 else 'stopped'
```

The lambda reads `motor_speed` when called. The expression returns one of the two strings.

For exercise 6.2, `next(gen)` advances a generator. Use `try` and `except` to handle completion:

```python
try:
    next(gen)
except StopIteration:
    print('The generator ended.')
```

`while True` repeats until the function returns or the loop exits. Count only successful `next()` calls. Code after the final `yield` runs on a later call that reaches completion. That call raises `StopIteration`.

## Exercises

### 6.1 Lambdas read the live value

{% include interactive/python-exercise.html id="py6_lambda_status" %}

### 6.2 Step a generator until it ends

{% include interactive/python-exercise.html id="py6_count_frames" %}

### 6.3 Predict, then measure

{% include interactive/python-exercise.html id="py6_hopper_frames" %}

### 6.4 Extension: start and stop an intake

{% include interactive/python-exercise.html id="py6_intake_callbacks" %}

## After the lessons

Open `robot/oi.py` with a mentor. Trace one button binding from the press to the motor command. You now know every Python tool it uses.
