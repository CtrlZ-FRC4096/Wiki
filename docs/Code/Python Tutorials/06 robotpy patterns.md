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

Why the lambda? `Button(self.robot.rumble_d1)` would freeze the startup value forever. `Button(lambda: self.robot.rumble_d1)` hands over a function, and the button calls it every frame. It always reads the **current** value. Our controllers use this for soft triggers like rumble flags.

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

## Try it: what a decorator does

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:Y2xhc3MgVGlueUJ1dHRvbjoKICAgICMgQSBwcmV0ZW5kIGJ1dHRvbi4gVXNlZCB0byBzaG93IHdoYXQgYSBkZWNvcmF0b3IgZG9lcy4KICAgIGRlZiBfX2luaXRfXyhzZWxmKToKICAgICAgICBzZWxmLmhhbmRsZXIgPSBOb25lCgogICAgZGVmIHdoZW5QcmVzc2VkKHNlbGYsIGZuKToKICAgICAgICBzZWxmLmhhbmRsZXIgPSBmbiAgICAgICAgIyBzdG9yZSB0aGUgZnVuY3Rpb24KICAgICAgICByZXR1cm4gZm4KCiAgICBkZWYgcHJlc3Moc2VsZik6ICAgICAgICAgICAgICMgdGhlIGRyaXZlciBwcmVzc2VkIHRoZSBidXR0b24KICAgICAgICBpZiBzZWxmLmhhbmRsZXIgaXMgbm90IE5vbmU6CiAgICAgICAgICAgIHNlbGYuaGFuZGxlcigpICAgICAgICMgY2FsbCB0aGUgc3RvcmVkIGZ1bmN0aW9uCgphX2J1dHRvbiA9IFRpbnlCdXR0b24oKQoKQGFfYnV0dG9uLndoZW5QcmVzc2VkCmRlZiBfKCk6CiAgICBwcmludCgnQSB3YXMgcHJlc3NlZCEnKQoKYV9idXR0b24ucHJlc3MoKQ==" width="100%" height="560px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

## Exercises

Every exercise ends with tests. Run the code until every line prints **PASS**.

### 6.1 Lambdas read the current value

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:bW90b3Jfc3BlZWQgPSAwLjAKCiMgQSBsYW1iZGEgcmVhZHMgdGhlIHZhbHVlIGFnYWluIGVhY2ggdGltZSBpdCBpcyBjYWxsZWQuCmdldF9zcGVlZCA9IGxhbWJkYTogbW90b3Jfc3BlZWQKcHJpbnQoZ2V0X3NwZWVkKCkpICAgIyAwLjAKbW90b3Jfc3BlZWQgPSA1LjIKcHJpbnQoZ2V0X3NwZWVkKCkpICAgIyA1LjIKCiMgUEFSVCBBOiBtYWtlIGEgbGFtYmRhIHN0YXR1cy4gSXQgcmV0dXJucwojICdzcGlubmluZycgd2hlbiBtb3Rvcl9zcGVlZCA+IDAuMSwgZWxzZSAnc3RvcHBlZCcKc3RhdHVzID0gbGFtYmRhOiAnJyAgIyBGSVggVEhJUwoKIyBQQVJUIEI6IG1ha2UgYSBsYW1iZGEgaGVhbHRoeS4gSXQgcmV0dXJucwojIFRydWUgd2hlbiAtNjAgPCBtb3Rvcl9zcGVlZCA8IDYwLCBlbHNlIEZhbHNlCmhlYWx0aHkgPSBsYW1iZGE6IEZhbHNlICAjIEZJWCBUSElTCgojIHRlc3Qgc2NhZmZvbGQgKGRvIG5vdCBjaGFuZ2UpCm1vdG9yX3NwZWVkID0gNS4yCnQxID0gc3RhdHVzKCkKdDIgPSBoZWFsdGh5KCkKbW90b3Jfc3BlZWQgPSAwLjA1CnQzID0gc3RhdHVzKCkKbW90b3Jfc3BlZWQgPSAxMDAuMAp0NCA9IGhlYWx0aHkoKQoKCiMgLS0tLS0gVEVTVFMgKGRvIG5vdCBjaGFuZ2UpIC0tLS0tCmRlZiBjaGVjayhuYW1lLCBmbik6CiAgICB0cnk6CiAgICAgICAgb2sgPSBib29sKGZuKCkpCiAgICBleGNlcHQgRXhjZXB0aW9uOgogICAgICAgIG9rID0gRmFsc2UKICAgIHByaW50KCgnUEFTUycgaWYgb2sgZWxzZSAnRkFJTCcpICsgJyAtICcgKyBuYW1lKQogICAgcmV0dXJuIG9rCgpzY29yZSA9IHN1bShbCiAgICBjaGVjaygnNS4yIGlzIHNwaW5uaW5nJywgbGFtYmRhOiB0MSA9PSAnc3Bpbm5pbmcnKSwKICAgIGNoZWNrKCc1LjIgaXMgaGVhbHRoeScsIGxhbWJkYTogdDIgaXMgVHJ1ZSksCiAgICBjaGVjaygnMC4wNSBpcyBzdG9wcGVkJywgbGFtYmRhOiB0MyA9PSAnc3RvcHBlZCcpLAogICAgY2hlY2soJzEwMCBpcyBub3QgaGVhbHRoeScsIGxhbWJkYTogdDQgaXMgRmFsc2UpCl0pCnByaW50KGYnU0NPUkU6IHtzY29yZX0vNCcp" width="100%" height="520px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Hint</summary>

`X if condition else Y` is an if/else on one line. Chained comparisons work inside a lambda, too.
</details>

<details markdown="block">
<summary>Solution</summary>

```python
status = lambda: 'spinning' if motor_speed > 0.1 else 'stopped'
healthy = lambda: -60 < motor_speed < 60
```

The test scaffold changes `motor_speed` between calls. The lambdas see the new values because they re-read the variable at call time.
</details>

### 6.2 Step a generator until it ends

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:ZGVmIHJ1bWJsZV9mb3JfdGhyZWVfZnJhbWVzKCk6CiAgICBmcmFtZSA9IDAKICAgIHByaW50KCdydW1ibGUgT04nKQogICAgd2hpbGUgZnJhbWUgPCAzOgogICAgICAgIGZyYW1lICs9IDEKICAgICAgICB5aWVsZCAgICAgICAgICAgICMgd2FpdCBmb3IgbmV4dCgpIGZyb20gdGhlIHNjaGVkdWxlcgogICAgcHJpbnQoJ3J1bWJsZSBPRkYnKQoKIyBQQVJUIEE6IHdyaXRlIGNvdW50X2ZyYW1lcyhnZW4pLiBTdGVwIHRoZSBnZW5lcmF0b3Igd2l0aCBuZXh0KCkKIyB1bnRpbCBpdCBlbmRzLiBSZXR1cm4gaG93IG1hbnkgdGltZXMgbmV4dCgpIHN1Y2NlZWRlZC4KZGVmIGNvdW50X2ZyYW1lcyhnZW4pOgogICAgbiA9IDAKICAgICMgVXNlIHRyeSAvIGV4Y2VwdC4gU3RvcEl0ZXJhdGlvbiBtZWFucyB0aGUgY29tbWFuZCBlbmRlZC4KICAgIHBhc3MKCiMgdGVzdCBzY2FmZm9sZCAoZG8gbm90IGNoYW5nZSkKZGVmIGVtcHR5KCk6CiAgICByZXR1cm4KICAgIHlpZWxkCgpkZWYgb25jZSgpOgogICAgeWllbGQKCgojIC0tLS0tIFRFU1RTIChkbyBub3QgY2hhbmdlKSAtLS0tLQpkZWYgY2hlY2sobmFtZSwgZm4pOgogICAgdHJ5OgogICAgICAgIG9rID0gYm9vbChmbigpKQogICAgZXhjZXB0IEV4Y2VwdGlvbjoKICAgICAgICBvayA9IEZhbHNlCiAgICBwcmludCgoJ1BBU1MnIGlmIG9rIGVsc2UgJ0ZBSUwnKSArICcgLSAnICsgbmFtZSkKICAgIHJldHVybiBvawoKc2NvcmUgPSBzdW0oWwogICAgY2hlY2soJ3J1bWJsZSBydW5zIDMgZnJhbWVzJywgbGFtYmRhOiBjb3VudF9mcmFtZXMocnVtYmxlX2Zvcl90aHJlZV9mcmFtZXMoKSkgPT0gMyksCiAgICBjaGVjaygnZW1wdHkgZ2VuZXJhdG9yIHJ1bnMgMCBmcmFtZXMnLCBsYW1iZGE6IGNvdW50X2ZyYW1lcyhlbXB0eSgpKSA9PSAwKSwKICAgIGNoZWNrKCdvbmUteWllbGQgZ2VuZXJhdG9yIHJ1bnMgMSBmcmFtZScsIGxhbWJkYTogY291bnRfZnJhbWVzKG9uY2UoKSkgPT0gMSkKXSkKcHJpbnQoZidTQ09SRToge3Njb3JlfS8zJyk=" width="100%" height="560px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Hint</summary>

Loop `while True: next(gen)` and add 1 to a counter each time. Wrap it in `try`, catch `StopIteration`, return the count.
</details>

<details markdown="block">
<summary>Solution</summary>

```python
def count_frames(gen):
    n = 0
    try:
        while True:
            next(gen)
            n += 1
    except StopIteration:
        return n
```

This is a tiny version of what our `CoroutineCommand` wrapper does with every command function in `oi.py`. Notice: creating the generator prints nothing. It starts only at the first `next()` call.
</details>

### 6.3 Field a prediction

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:IyBBIGNvbW1hbmQgcGF0dGVybiBmcm9tIG9pLnB5LgpkZWYgaW50YWtlX3VudGlsX2Z1bGwoKToKICAgIGZyYW1lcyA9IDAKICAgIHdoaWxlIGZyYW1lcyA8IDU6ICAgICMgdGhlIGhvcHBlciBmaWxscyBpbiA1IGZyYW1lcyByaWdodCBub3cKICAgICAgICBmcmFtZXMgKz0gMSAgICAgICMgb25lIG1vcmUgZnJhbWUgb2Ygd29yawogICAgICAgIHlpZWxkICAgICAgICAgICAgIyBnaXZlIGNvbnRyb2wgYmFjayB0byB0aGUgc2NoZWR1bGVyCgojIFBBUlQgQTogY2hhbmdlIGludGFrZV91bnRpbF9mdWxsIHNvIGl0IGZpbGxzIGluIDEwMCBmcmFtZXMgaW5zdGVhZC4KCiMgUEFSVCBCOiBzZXQgcHJlZGljdGlvbiB0byB0aGUgbnVtYmVyIGNvdW50X2ZyYW1lcyB3aWxsIHJlcG9ydC4KcHJlZGljdGlvbiA9IDAgICMgRklYIFRISVMKCiMgdGVzdCBzY2FmZm9sZCAoZG8gbm90IGNoYW5nZSkKZGVmIGNvdW50X2ZyYW1lcyhnZW4pOgogICAgbiA9IDAKICAgIHRyeToKICAgICAgICB3aGlsZSBUcnVlOgogICAgICAgICAgICBuZXh0KGdlbikKICAgICAgICAgICAgbiArPSAxCiAgICBleGNlcHQgU3RvcEl0ZXJhdGlvbjoKICAgICAgICByZXR1cm4gbgoKbWVhc3VyZWQgPSBjb3VudF9mcmFtZXMoaW50YWtlX3VudGlsX2Z1bGwoKSkKCgojIC0tLS0tIFRFU1RTIChkbyBub3QgY2hhbmdlKSAtLS0tLQpkZWYgY2hlY2sobmFtZSwgZm4pOgogICAgdHJ5OgogICAgICAgIG9rID0gYm9vbChmbigpKQogICAgZXhjZXB0IEV4Y2VwdGlvbjoKICAgICAgICBvayA9IEZhbHNlCiAgICBwcmludCgoJ1BBU1MnIGlmIG9rIGVsc2UgJ0ZBSUwnKSArICcgLSAnICsgbmFtZSkKICAgIHJldHVybiBvawoKc2NvcmUgPSBzdW0oWwogICAgY2hlY2soJ2Z1bGwgYWZ0ZXIgMTAwIGZyYW1lcycsIGxhbWJkYTogbWVhc3VyZWQgPT0gMTAwKSwKICAgIGNoZWNrKCdwcmVkaWN0aW9uIHdhcyByaWdodCcsIGxhbWJkYTogcHJlZGljdGlvbiA9PSAxMDApCl0pCnByaW50KGYnU0NPUkU6IHtzY29yZX0vMicp" width="100%" height="620px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Hint</summary>

Only the number in `while frames < 5:` needs to change. Predict before you change it.
</details>

<details markdown="block">
<summary>Solution</summary>

```python
while frames < 100:
    frames += 1
    yield
```

Prediction: 100. Each `yield` is one successful `next()`. At 20 ms per frame, 100 frames is 2 seconds. The real rumble command uses the same pattern with a `Timer` instead of a frame count.
</details>

## After the lessons

Open `robot/oi.py` with a mentor. Trace one button binding from the press to the motor command. You now know every Python tool it uses.
