---
title: 3. Lists and Loops
parent: Python Tutorials
nav_order: 3
---

# 3. Lists and Loops

Store many values in order. Do the same thing to all of them without copy-pasting.

## Summary

A list keeps values in order:

```python
currents = [38.2, 41.0, 39.5, 31.4]
```

Tools for lists:

- Read one value with an **index**. Indexes start at 0: `currents[0]` is `38.2`.
- `currents[-1]` reads the last value: `31.4`.
- An index that is too big gives an `IndexError`.
- `len(currents)` gives the count: `4`.
- `currents.append(40.1)` adds a value to the end.

A loop visits each value:

```python
for c in currents:                  # each value in the list
    print(c)

for i in range(4):                  # i = 0, 1, 2, 3
    print(i)

for i, c in enumerate(currents):    # index and value together
    print(f'module {i}: {c} A')

tick = 0
while tick < 100:                   # repeats while the condition is true
    tick += 1
```

Which one to use:

- `for x in list`: you need the values. Most common.
- `for i in range(n)`: you need to count, or index into the list.
- `for i, x in enumerate(list)`: you need the index and the value.
- `while`: you do not know how many repeats. Be careful: a wrong condition loops forever.
- `break` inside a loop exits it at once.

{: .note }
In robot code, do not use a bare `while` to wait for time to pass. The robot runs its loop 50 times per second, and a blocking `while` stops all of it. Waiting uses coroutines with `yield` (lesson 6).

## In our robot code

`robot/robot.py` registers every subsystem with one loop instead of copy-pasted lines:

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

{% include interactive/python-exercise.html id="py3_try" %}

## Exercises

### 3.1 Total current and hot modules

{% include interactive/python-exercise.html id="py3_currents" %}

### 3.2 Find the module with the most current

{% include interactive/python-exercise.html id="py3_hot_module" %}

### 3.3 Count robot frames

{% include interactive/python-exercise.html id="py3_tick_seconds" %}

Next lesson: **4. Functions**.
