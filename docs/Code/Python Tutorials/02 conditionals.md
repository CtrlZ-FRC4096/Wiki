---
title: 2. Conditionals and Logic
parent: Python Tutorials
nav_order: 2
---

# 2. Conditionals and Logic

Do different things for different states. This is how a subsystem decides what to do each frame.

## Summary

```python
if voltage < 11:
    print('CRITICAL')
elif voltage < 12:
    print('LOW')
else:
    print('GOOD')
```

Rules and tools:

- A condition ends with a colon `:`. The lines under it are indented with four spaces. Indented lines belong to the `if`. A wrong indent gives a syntax error.
- `elif` means "else if". The conditions run top to bottom. The **first** true one runs, and the rest are skipped. Order sets priority.
- `else` runs when no condition above it was true. It is optional.
- Comparisons: `==` equal, `!=` not equal, `<`, `<=`, `>`, `>=`.
- Chain comparisons like math: `2.5 < time_left < 3` means both parts are true. Our hub-shift rumble code uses this.
- Combine conditions with `and`, `or`, `not`:

```python
is_intaking = True
fuel_in_hopper = 10

is_intaking and fuel_in_hopper < 24   # True: both parts are true
is_intaking or fuel_in_hopper == 0    # True: one part is true
not is_intaking                       # False
```

- `None` means: no value yet. Example: `self.auto_win = None` until the FMS sends the auto winner. Test it with `is None` or `is not None`, not with `==`.
- Name bool variables like questions: `is_intaking`, `at_default`, `has_fuel`. The name should tell you what True means.

> Common mistake: `if is_intaking = True:` assigns a value. It does not compare. Python shows a SyntaxError. Use `==` to compare, or just write `if is_intaking:`.

## In our robot code

`robot/subsystems/intake.py`, `periodic()`. This runs every frame. The order sets the priority:

```python
if self.robot.intake_at_default:
    self.stop_intake()
elif self.robot.clear_jam:
    self.set_intake_speed(-0.3 * 100)
elif self.robot.is_intaking:
    self.set_intake_speed(0.85 * 100)
```

`robot/robot.py`, the Auto Win logging:

```python
if self.auto_win is None:
    SmartDashboard.putString("Auto Win", "UNKNOWN")
```

## Try it

{% include interactive/python-exercise.html id="py2_try" %}

## Exercises

### 2.1 Battery warnings and shift windows

{% include interactive/python-exercise.html id="py2_battery_shift" %}

### 2.2 The intake state machine

{% include interactive/python-exercise.html id="py2_intake_states" %}

### 2.3 Label the auto winner

{% include interactive/python-exercise.html id="py2_auto_win" %}

Next lesson: **3. Lists and Loops**.
