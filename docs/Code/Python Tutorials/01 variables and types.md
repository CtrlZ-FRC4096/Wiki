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

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:dGVhbSA9IDQwOTYKbmFtZSA9ICdDdHJsLVonCnNwZWVkID0gMy4yICAjIG1ldGVycyBwZXIgc2Vjb25kCnByaW50KGYnVGVhbSB7dGVhbX0gKHtuYW1lfSkgZHJpdmVzIGF0IHtzcGVlZH0gbS9zJyk=" width="100%" height="300px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

## Exercises

Every exercise ends with tests. Run the code until every line prints **PASS**.

### 1.1 Inches to meters

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:IyBUaGUgcm9ib3QgdXNlcyBtZXRlcnMuIFdlIGJ1aWxkIGluIGluY2hlcy4gMSBpbmNoID0gMC4wMjU0IG0uCmluY2hlcyA9IDI4LjUKCiMgUEFSVCBBOiBzZXQgbWV0ZXJzIHRvIGluY2hlcyAqIDAuMDI1NAptZXRlcnMgPSAwLjAgICMgRklYIFRISVMKCiMgUEFSVCBCOiBzZXQgbWVzc2FnZSB0byBhbiBmLXN0cmluZzogJzI4LjUgaW5jaGVzID0gMC43MiBtZXRlcnMnCiMgKHR3byBkZWNpbWFsIHBsYWNlcyBmb3IgbWV0ZXJzKQptZXNzYWdlID0gJycgICMgRklYIFRISVMKCgojIC0tLS0tIFRFU1RTIChkbyBub3QgY2hhbmdlKSAtLS0tLQpkZWYgY2hlY2sobmFtZSwgZm4pOgogICAgdHJ5OgogICAgICAgIG9rID0gYm9vbChmbigpKQogICAgZXhjZXB0IEV4Y2VwdGlvbjoKICAgICAgICBvayA9IEZhbHNlCiAgICBwcmludCgoJ1BBU1MnIGlmIG9rIGVsc2UgJ0ZBSUwnKSArICcgLSAnICsgbmFtZSkKICAgIHJldHVybiBvawoKc2NvcmUgPSBzdW0oWwogICAgY2hlY2soJ21ldGVycyBoYXMgdGhlIHJpZ2h0IHZhbHVlJywgbGFtYmRhOiBhYnMobWV0ZXJzIC0gMC43MjM5KSA8IDAuMDAwMSksCiAgICBjaGVjaygnbWV0ZXJzIGlzIGEgZmxvYXQnLCBsYW1iZGE6IHR5cGUobWV0ZXJzKSBpcyBmbG9hdCksCiAgICBjaGVjaygnbWVzc2FnZSBoYXMgYm90aCBudW1iZXJzJywgbGFtYmRhOiAnMjguNScgaW4gbWVzc2FnZSBhbmQgJzAuNzInIGluIG1lc3NhZ2UpCl0pCnByaW50KGYnU0NPUkU6IHtzY29yZX0vMycp" width="100%" height="460px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Hint</summary>

PART A is one multiply. PART B: look at the f-string examples in the summary, especially the `:.2f` format.
</details>

<details markdown="block">
<summary>Solution</summary>

```python
meters = inches * 0.0254
message = f'{inches} inches = {meters:.2f} meters'
```
</details>

### 1.2 Clamp a joystick value

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:IyBKb3lzdGlja3MgY2FuIHJlcG9ydCBtb3JlIHRoYW4gMS4wLiBDbGFtcCBjb21tYW5kcyBpbnRvIFstMSwgMV0uCgpzdGlja19oaWdoID0gMS40CiMgUEFSVCBBOiBjbGFtcCBzdGlja19oaWdoIGludG8gY2xhbXBlZF9oaWdoLiBVc2UgbWluKCkgYW5kIG1heCgpLgpjbGFtcGVkX2hpZ2ggPSAwLjAgICMgRklYIFRISVMKCnN0aWNrX2xvdyA9IC0yLjUKIyBQQVJUIEI6IGNsYW1wIHN0aWNrX2xvdyBpbnRvIGNsYW1wZWRfbG93CmNsYW1wZWRfbG93ID0gMC4wICAjIEZJWCBUSElTCgoKIyAtLS0tLSBURVNUUyAoZG8gbm90IGNoYW5nZSkgLS0tLS0KZGVmIGNoZWNrKG5hbWUsIGZuKToKICAgIHRyeToKICAgICAgICBvayA9IGJvb2woZm4oKSkKICAgIGV4Y2VwdCBFeGNlcHRpb246CiAgICAgICAgb2sgPSBGYWxzZQogICAgcHJpbnQoKCdQQVNTJyBpZiBvayBlbHNlICdGQUlMJykgKyAnIC0gJyArIG5hbWUpCiAgICByZXR1cm4gb2sKCnNjb3JlID0gc3VtKFsKICAgIGNoZWNrKCdzdGlja19oaWdoIGNsYW1wcyB0byAxJywgbGFtYmRhOiBhYnMoY2xhbXBlZF9oaWdoIC0gMSkgPCAwLjAwMDEpLAogICAgY2hlY2soJ3N0aWNrX2xvdyBjbGFtcHMgdG8gLTEnLCBsYW1iZGE6IGFicyhjbGFtcGVkX2xvdyAtICgtMSkpIDwgMC4wMDAxKQpdKQpwcmludChmJ1NDT1JFOiB7c2NvcmV9LzInKQ==" width="100%" height="440px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Hint</summary>

`min(a, b)` picks the smaller of two values. `max(a, b)` picks the bigger. Which one keeps 1.4 from going above 1?
</details>

<details markdown="block">
<summary>Solution</summary>

```python
clamped_high = max(-1, min(1, stick_high))
clamped_low = max(-1, min(1, stick_low))
```

`min(1, stick)` sets the maximum. `max(-1, ...)` sets the minimum. This two-function idiom appears all over robot code.
</details>

### 1.3 Battery flags

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:dm9sdGFnZSA9IDExLjgKCiMgUEFSVCBBOiBzZXQgaXNfbG93IHRvIFRydWUgd2hlbiB2b2x0YWdlIDwgMTIuMAppc19sb3cgPSBGYWxzZSAgIyBGSVggVEhJUwoKIyBQQVJUIEI6IHNldCBpc19jcml0aWNhbCB0byBUcnVlIHdoZW4gdm9sdGFnZSA8IDExLjAKaXNfY3JpdGljYWwgPSBUcnVlICAjIEZJWCBUSElTCgoKIyAtLS0tLSBURVNUUyAoZG8gbm90IGNoYW5nZSkgLS0tLS0KZGVmIGNoZWNrKG5hbWUsIGZuKToKICAgIHRyeToKICAgICAgICBvayA9IGJvb2woZm4oKSkKICAgIGV4Y2VwdCBFeGNlcHRpb246CiAgICAgICAgb2sgPSBGYWxzZQogICAgcHJpbnQoKCdQQVNTJyBpZiBvayBlbHNlICdGQUlMJykgKyAnIC0gJyArIG5hbWUpCiAgICByZXR1cm4gb2sKCnNjb3JlID0gc3VtKFsKICAgIGNoZWNrKCcxMS44IFYgY291bnRzIGFzIGxvdycsIGxhbWJkYTogaXNfbG93IGlzIFRydWUpLAogICAgY2hlY2soJ2lzX2xvdyBpcyBhIHJlYWwgYm9vbCcsIGxhbWJkYTogdHlwZShpc19sb3cpIGlzIGJvb2wpLAogICAgY2hlY2soJzExLjggViBpcyBub3QgY3JpdGljYWwnLCBsYW1iZGE6IGlzX2NyaXRpY2FsIGlzIEZhbHNlKQpdKQpwcmludChmJ1NDT1JFOiB7c2NvcmV9LzMnKQ==" width="100%" height="420px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Hint</summary>

A comparison like `voltage < 12.0` is itself a value: True or False. You can store it directly.
</details>

<details markdown="block">
<summary>Solution</summary>

```python
is_low = voltage < 12.0
is_critical = voltage < 11.0
```

Most flags in `robot.py` are computed this way. One test also checks the type: a comparison always gives a real bool.
</details>

Next lesson: **2. Conditionals and Logic**.
