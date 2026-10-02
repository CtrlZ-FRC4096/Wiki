---
title: 6. RobotPy Patterns
parent: Python Tutorials
nav_order: 6
---

# 6. RobotPy Patterns

Three parts of Python that our code uses everywhere: lambdas, button decorators, and `yield`.

## Summary

### Lambdas: read the value again later

```python
Button(lambda: self.robot.rumble_d1)
```

`lambda: expr` is a small function: `def nameless(): return expr`. The button calls it each frame and gets the **current** value of the flag. Without the lambda, the button would store the start value forever.

### Decorators: register a function

```python
@self.driver1.A.whenPressed
def _():
    self.robot.poseEstimator.set_yaw(0.0)
```

The `@x` line runs `x(your_function)` once at startup. `whenPressed` stores the function. The command scheduler calls it when the driver presses A. We name the function `_` because only the decorator uses it.

### Coroutines: a command as a timeline

A function with `yield` is a **generator**. It does not run when you call it. The scheduler advances it one `yield` each robot frame. When the function returns, the scheduler removes the command.

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

"Rumble for half a second" reads top to bottom, and the robot keeps driving during the wait. Do not use `time.sleep()` in robot code. Use `yield`.

## Try it: what a decorator does

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:Y2xhc3MgVGlueUJ1dHRvbjoKICAgICMgQSBwcmV0ZW5kIGJ1dHRvbi4gVXNlZCB0byBzaG93IHdoYXQgYSBkZWNvcmF0b3IgZG9lcy4KICAgIGRlZiBfX2luaXRfXyhzZWxmKToKICAgICAgICBzZWxmLmhhbmRsZXIgPSBOb25lCgogICAgZGVmIHdoZW5QcmVzc2VkKHNlbGYsIGZuKToKICAgICAgICBzZWxmLmhhbmRsZXIgPSBmbiAgICAgICAgIyBzdG9yZSB0aGUgZnVuY3Rpb24KICAgICAgICByZXR1cm4gZm4KCiAgICBkZWYgcHJlc3Moc2VsZik6ICAgICAgICAgICAgICMgdGhlIGRyaXZlciBwcmVzc2VkIHRoZSBidXR0b24KICAgICAgICBpZiBzZWxmLmhhbmRsZXIgaXMgbm90IE5vbmU6CiAgICAgICAgICAgIHNlbGYuaGFuZGxlcigpICAgICAgICMgY2FsbCB0aGUgc3RvcmVkIGZ1bmN0aW9uCgphX2J1dHRvbiA9IFRpbnlCdXR0b24oKQoKQGFfYnV0dG9uLndoZW5QcmVzc2VkCmRlZiBfKCk6CiAgICBwcmludCgnQSB3YXMgcHJlc3NlZCEnKQoKYV9idXR0b24ucHJlc3MoKQ==" width="100%" height="520px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

## Exercises

### 6.1 Lambdas read the current value

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:bW90b3Jfc3BlZWQgPSAwLjAKCiMgQSBsYW1iZGEgbGV0cyB0aGUgY29kZSByZWFkIHRoZSB2YWx1ZSBhZ2FpbiBsYXRlciwgbm90IG9uY2Ugbm93LgpnZXRfc3BlZWQgPSBsYW1iZGE6IG1vdG9yX3NwZWVkCgpwcmludChnZXRfc3BlZWQoKSkgICAjIDAuMAptb3Rvcl9zcGVlZCA9IDUuMgpwcmludChnZXRfc3BlZWQoKSkgICAjIDUuMiwgYmVjYXVzZSB0aGUgbGFtYmRhIHJlYWRzIHRoZSB2YWx1ZSBhZ2FpbgoKIyBZT1VSIENPREUgSEVSRTogbWFrZSBhIGxhbWJkYSBzdGF0dXMuIEl0IHJldHVybnMKIyBzcGlubmluZyB3aGVuIG1vdG9yX3NwZWVkID4gMC4xLCBlbHNlIHN0b3BwZWQ=" width="100%" height="360px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Solution</summary>

```python
status = lambda: 'spinning' if motor_speed > 0.1 else 'stopped'
```

`X if condition else Y` is an if/else in one expression. Print `status()` before and after you change `motor_speed`.
</details>

### 6.2 Step a coroutine by hand

Run the code. Before you read the output, predict: when does "rumble OFF" print? How many times does "command finished" print?

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:ZGVmIHJ1bWJsZV9mb3JfdGhyZWVfZnJhbWVzKCk6CiAgICBmcmFtZSA9IDAKICAgIHByaW50KCdydW1ibGUgT04nKQogICAgd2hpbGUgZnJhbWUgPCAzOgogICAgICAgIGZyYW1lICs9IDEKICAgICAgICB5aWVsZCAgICAgICAgICAgICMgc3RvcCBoZXJlLiBXYWl0IGZvciBuZXh0KCkgZnJvbSB0aGUgc2NoZWR1bGVyLgogICAgcHJpbnQoJ3J1bWJsZSBPRkYnKQoKY21kID0gcnVtYmxlX2Zvcl90aHJlZV9mcmFtZXMoKSAgIyBub3RoaW5nIHJ1bnMgeWV0CmZvciBfIGluIHJhbmdlKDUpOgogICAgcHJpbnQoJy0tLSBzY2hlZHVsZXIgdGljayAtLS0nKQogICAgdHJ5OgogICAgICAgIG5leHQoY21kKSAgICAgICAgICAgICAgICAjIHJ1biB1cCB0byB0aGUgbmV4dCB5aWVsZAogICAgZXhjZXB0IFN0b3BJdGVyYXRpb246CiAgICAgICAgcHJpbnQoJ2NvbW1hbmQgZmluaXNoZWQnKQ==" width="100%" height="500px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Solution</summary>

"rumble ON" prints at tick 1, "rumble OFF" at tick 4. "command finished" prints twice, at the end. `cmd = rumble_for_three_frames()` runs nothing: a generator starts at the first `next()`.

Our `CoroutineCommand` wrapper does this for each command in `oi.py`.
</details>

### 6.3 A command as a state loop

This is the `while True: yield` pattern at the end of `robot_start`, `teleop_mode`, and the drivetrain default command:

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:ZGVmIGludGFrZV91bnRpbF9mdWxsKCk6CiAgICBmcmFtZXMgPSAwCiAgICB3aGlsZSBUcnVlOiAgICAgICAgICAjIHRoZSByb2JvdCBsb29wIGRvZXMgbm90IHN0b3AKICAgICAgICBmcmFtZXMgKz0gMSAgICAgICMgdXBkYXRlIHN0YXRlIGVhY2ggZnJhbWUKICAgICAgICBpZiBmcmFtZXMgPj0gNToKICAgICAgICAgICAgcHJpbnQoJ2hvcHBlciBmdWxsLCBjb21tYW5kIGRvbmUnKQogICAgICAgICAgICByZXR1cm4gICAgICAgIyBlbmRzIHRoZSBnZW5lcmF0b3IKICAgICAgICB5aWVsZCAgICAgICAgICAgICMgZ2l2ZSBjb250cm9sIGJhY2sgdG8gdGhlIHNjaGVkdWxlcgoKY21kID0gaW50YWtlX3VudGlsX2Z1bGwoKQp0cnk6CiAgICB3aGlsZSBUcnVlOgogICAgICAgIG5leHQoY21kKQpleGNlcHQgU3RvcEl0ZXJhdGlvbjoKICAgIHByaW50KCdzY2hlZHVsZXIgc2VlcyBTdG9wSXRlcmF0aW9uIGFuZCByZW1vdmVzIHRoZSBjb21tYW5kJykKCiMgVEFTSzogY2hhbmdlIHRoZSBjb2RlIHNvIHRoZSBob3BwZXIgZmlsbHMgaW4gMTAwIGZyYW1lcyAoMiBzZWNvbmRzKS4=" width="100%" height="500px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Solution</summary>

Change `5` to `100`. At 20 ms per frame, that is about 2 seconds. The rumble command in `oi.py` uses the same pattern with a `Timer` instead of a frame count.
</details>

## After this lesson

Open `robot/oi.py` with a mentor. Trace one button binding from the press to the motor command.
