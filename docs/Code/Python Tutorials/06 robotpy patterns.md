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
@self.driver1.A.whenPressed
def _():
    self.robot.poseEstimator.set_yaw(0.0)
```

A line `@x` above a function runs once at startup: it calls `x(your_function)` right away. `whenPressed` **stores** your function. The command scheduler calls it later, when the driver presses A.

Two details you will see in `oi.py`:

- The function is named `_` on purpose. It means: only the decorator uses this name.
- `whenHeld` runs the function every frame while the button is down. `whenReleased` runs once when it comes up.

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
Do not use `time.sleep()` in robot code. Sleep freezes the whole robot loop. Use `yield` to wait one frame at a time.

## Try it

{% include interactive/python-exercise.html id="py6_try" %}

## Exercises

### 6.1 Lambdas read the live value

{% include interactive/python-exercise.html id="py6_lambda_status" %}

### 6.2 Step a generator until it ends

{% include interactive/python-exercise.html id="py6_count_frames" %}

### 6.3 Predict, then measure

{% include interactive/python-exercise.html id="py6_hopper_frames" %}

## After the lessons

Open `robot/oi.py` with a mentor. Trace one button binding from the press to the motor command. You now know every Python tool it uses.
