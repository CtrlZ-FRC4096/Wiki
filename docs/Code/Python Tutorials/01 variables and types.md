---
title: 1. Variables and Types
parent: Python Tutorials
nav_order: 1
---

# 1. Variables and Types

A variable stores a value under a name.

## Summary

```python
fly_speed = 50          # int: whole number
hood_angle = 35.5       # float: number with a decimal point
is_intaking = False     # bool: True or False
name = 'Ctrl-Z'         # str: text
```

- `=` stores a value. `==` compares values (lesson 2).
- Use `snake_case` for variable names. Use `UPPER_CASE` for constants, like in `const.py`.
- Math: `+` `-` `*` `/`. Also useful: `//` divides and drops the remainder, `%` gives the remainder, `**` is power.
- Useful functions: `abs(x)`, `min(a, b)`, `max(a, b)`.
- An f-string puts values into text: `f'speed = {fly_speed}'`. Use `:.1f` to keep one decimal place: `f'{hood_angle:.1f}'`.

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

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:dGVhbSA9IDQwOTYKbmFtZSA9ICdDdHJsLVonCnNwZWVkID0gMy4yICAjIG1ldGVycyBwZXIgc2Vjb25kCnByaW50KGYnVGVhbSB7dGVhbX0gKHtuYW1lfSkgZHJpdmVzIGF0IHtzcGVlZH0gbS9zJyk=" width="100%" height="300px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

## Exercises

### 1.1 Inches to meters

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:IyBUaGUgcm9ib3QgdXNlcyBtZXRlcnMuIFdlIGJ1aWxkIGluIGluY2hlcy4KIyAxIGluY2ggPSAwLjAyNTQgbWV0ZXJzCmluY2hlcyA9IDI4LjUgICMgZHJpdmUgYmFzZSB3aWR0aAoKIyBZT1VSIENPREUgSEVSRTogc2V0IG1ldGVycyB0byBpbmNoZXMgKiAwLjAyNTQKCgpwcmludChmJ3tpbmNoZXN9IGluY2hlcyA9IHttZXRlcnN9IG1ldGVycycp" width="100%" height="320px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Solution</summary>

```python
meters = inches * 0.0254
```
</details>

### 1.2 Clamp a joystick value

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:c3RpY2sgPSAxLjQgICMgdGhlIGpveXN0aWNrIGNhbiByZXBvcnQgbW9yZSB0aGFuIDEuMAoKIyBZT1VSIENPREUgSEVSRTogY2xhbXAgc3RpY2sgaW50byBbLTEsIDFdLiBVc2UgbWluKCkgYW5kIG1heCgpLgojIFN0b3JlIHRoZSByZXN1bHQgaW4gY2xhbXBlZC4KCgpwcmludChmJ2NvbW1hbmRlZCBzcGVlZDoge2NsYW1wZWR9Jyk=" width="100%" height="320px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Solution</summary>

```python
clamped = max(-1, min(1, stick))
```

`min(1, stick)` sets the maximum. `max(-1, ...)` sets the minimum. Change `stick` to `-2.5` and run again.
</details>

### 1.3 Battery flag

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:dm9sdGFnZSA9IDExLjgKCiMgWU9VUiBDT0RFIEhFUkU6IHNldCBpc19sb3cgdG8gVHJ1ZSB3aGVuIHZvbHRhZ2UgPCAxMi4wCgoKcHJpbnQoZidiYXR0ZXJ5OiB7dm9sdGFnZX0gViwgbG93ID0ge2lzX2xvd30nKQ==" width="100%" height="300px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Solution</summary>

```python
is_low = voltage < 12.0
```

A comparison is a value. It gives True or False, and you can store it in a variable.
</details>

Next lesson: **2. Conditionals and Logic**.
