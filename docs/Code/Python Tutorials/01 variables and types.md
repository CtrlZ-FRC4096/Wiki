---
title: 1. Variables and Types
parent: Python Tutorials
nav_order: 1
---

# 1. Variables and Types

A variable stores a value under a name. Robot code is full of variables: motor speeds, positions, and True/False flags.

## Summary

```python
fly_speed = 50          # int: whole number
hood_angle = 35.5       # float: number with a decimal point
is_intaking = False     # bool: only True or False
team_name = 'Ctrl-Z'    # str: text
```

Rules and tools:

- `=` stores a value in a name. `==` compares two values (more in lesson 2).
- Anything after `#` on a line is a comment. Python ignores it.
- Use `snake_case` for variable names. Use `UPPER_CASE` for constants that never change, like the ones in `const.py`.
- A name must exist before you read it. Reading a name that does not exist gives a `NameError`. Most NameErrors are typos.
- Math operators: `+` `-` `*` work as usual. Division is special:
  - `/` always gives a float: `7 / 2` is `3.5`
  - `//` divides and drops the remainder: `7 // 2` is `3`
  - `%` gives only the remainder: `7 % 2` is `1`
  - `**` is a power: `2 ** 3` is `8`
- `tick += 1` is short for `tick = tick + 1`. You will see this in every loop we write.
- Useful built-in functions: `abs(x)`, `min(a, b)`, `max(a, b)`.
- An f-string puts values into text. Prefix the string with `f` and put the variable inside `{}`:

```python
speed = 3.14159
print(f'moving at {speed} m/s')      # moving at 3.14159 m/s
print(f'moving at {speed:.1f} m/s')  # moving at 3.1 m/s
```

Use `:.1f` to keep one decimal place, `:.2f` for two. Most dashboard numbers in our code print this way.

## In our robot code

Constants in `robot/const.py`:

```python
SWERVE_DRIVE_GEAR_RATIO = 5.68
DRIVETRAIN_TRACKWIDTH_METERS = inchesToMeters(23.5)
```

Booleans in `robot/robot.py` store the state of the robot:

```python
self.shoot_intent = False
self.is_intaking = False
self.fly_speed = 50
```

## Try it

{% include interactive/python-exercise.html id="py1_try" %}

## Exercises

### 1.1 Inches to meters

{% include interactive/python-exercise.html id="py1_inches_meters" %}

### 1.2 Clamp joystick values

{% include interactive/python-exercise.html id="py1_clamp" %}

### 1.3 Battery flags

{% include interactive/python-exercise.html id="py1_battery_flags" %}

Next lesson: **2. Conditionals and Logic**.
