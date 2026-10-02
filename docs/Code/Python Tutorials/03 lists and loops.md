---
title: 3. Lists and Loops
parent: Python Tutorials
nav_order: 3
---

# 3. Lists and Loops

Store many values. Do the same thing to all of them.

## Summary

A list stores values in order:

```python
currents = [38.2, 41.0, 39.5, 31.4]
print(currents[0])     # 38.2  (indexes start at 0)
print(len(currents))   # 4
currents.append(40.1)  # adds to the end
```

A loop visits each value:

```python
for c in currents:                  # each value
    print(c)

for i in range(4):                  # i = 0, 1, 2, 3
    print(i)

for i, c in enumerate(currents):    # index and value
    print(f'module {i}: {c} A')

tick = 0
while tick < 50:                    # repeats while the condition is true
    tick += 1
```

- Use `for item in list` when you need the values.
- Use `enumerate` when you need the position too.
- Use `while` when you do not know the number of repeats.
- In robot code, do not use a bare `while` to wait for time. It blocks the robot loop. Use a coroutine with `yield` (lesson 6).

## In our robot code

`robot/robot.py` registers and logs all subsystems with two short loops:

```python
self.subsystems = [
    self.drivetrain, self.poseEstimator,
    self.intake, self.shooter, self.hopper,
]
for subsystem in self.subsystems:
    self.scheduler.registerSubsystem(subsystem)
```

The hopper fuel simulation uses `range`:

```python
for fuel_num in range(1, self.max_fuel_in_hopper + 1):
    ...
```

## Try it

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:c3Vic3lzdGVtcyA9IFsnZHJpdmV0cmFpbicsICdzaG9vdGVyJywgJ2ludGFrZScsICdob3BwZXInXQoKZm9yIHMgaW4gc3Vic3lzdGVtczoKICAgIHByaW50KGYncmVnaXN0ZXJpbmcge3N9JykKCmZvciBpLCBzIGluIGVudW1lcmF0ZShzdWJzeXN0ZW1zKToKICAgIHByaW50KGYnbW9kdWxlIHtpfToge3N9Jyk=" width="100%" height="340px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

## Exercises

### 3.1 Read each module

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:Y3VycmVudHMgPSBbMzguMiwgNDEuMCwgMzkuNSwgMzEuNF0gICMgYW1wcywgb25lIHBlciBzd2VydmUgbW9kdWxlCgojIFlPVVIgQ09ERSBIRVJFOiBwcmludCBlYWNoIGN1cnJlbnQgb24gaXRzIG93biBsaW5lOiAzOC4yIEE=" width="100%" height="260px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Solution</summary>

```python
for c in currents:
    print(f'{c} A')
```
</details>

### 3.2 Find the module with the most current

A swerve module with too much current can have a mechanical problem. Find it:

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:Y3VycmVudHMgPSBbMzguMiwgNDEuMCwgMzkuNSwgMzEuNF0KCiMgWU9VUiBDT0RFIEhFUkU6IHByaW50IHRoZSBpbmRleCBvZiB0aGUgbW9kdWxlIHdpdGggdGhlIG1vc3QgY3VycmVudC4KIyBIaW50OiByZW1lbWJlciB0aGUgYmVzdCBpbmRleC4gVXBkYXRlIGl0IGFzIHlvdSBsb29wLg==" width="100%" height="280px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Solution</summary>

```python
best = 0
for i, c in enumerate(currents):
    if c > currents[best]:
        best = i
print(f'module {best} draws {currents[best]} A')
```

A shorter way exists: `currents.index(max(currents))`. Do it by hand once first.
</details>

### 3.3 Count robot frames

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:dGljayA9IDAKCiMgT25lIHJvYm90IGZyYW1lIGlzIDIwIG1zLiA1MCB0aWNrcyA9IDEgc2Vjb25kLgojIFlPVVIgQ09ERSBIRVJFOiBjb3VudCB0aWNrIHRvIDUwIHdpdGggYSB3aGlsZSBsb29wLgojIEFmdGVyIHRoZSBsb29wLCBwcmludDogNTAgdGlja3MgPSAxIHNlY29uZCBvZiByb2JvdCB0aW1l" width="100%" height="280px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Solution</summary>

```python
while tick < 50:
    tick += 1
print('50 ticks = 1 second of robot time')
```
</details>

Next lesson: **4. Functions**.
