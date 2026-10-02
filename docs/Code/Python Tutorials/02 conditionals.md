---
title: 2. Conditionals and Logic
parent: Python Tutorials
nav_order: 2
---

# 2. Conditionals and Logic

Do different things for different states.

## Summary

```python
if voltage < 11:
    print('CRITICAL')
elif voltage < 12:
    print('LOW')
else:
    print('GOOD')
```

- Indent with four spaces. The indented lines belong to the `if`.
- The checks run from top to bottom. The first true condition wins.
- Compare with: `==` (equal), `!=`, `<`, `<=`, `>`, `>=`.
- Chain comparisons like math: `2.5 < time_left < 3`.
- Combine conditions with `and`, `or`, `not`:

```python
if is_intaking and fuel_in_hopper < 24:
    state = 'intaking'
```

- `None` means: no value yet. Example: `self.auto_win = None` until the FMS sends the auto winner. Test it with `is None` or `is not None`, not with `==`.

> Common mistake: `if is_intaking = True:` assigns a value. It does not compare. Python shows a SyntaxError. Use `==` to compare.

## In our robot code

`robot/subsystems/intake.py`, `periodic()`. The order sets the priority:

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

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:bWF0Y2hfdGltZSA9IDc1CgppZiBtYXRjaF90aW1lIDw9IDEwOgogICAgc2hpZnQgPSAnVFJBTlNJVElPTicKZWxpZiBtYXRjaF90aW1lIDw9IDExMDoKICAgIHNoaWZ0ID0gJ1NISUZUJwplbHNlOgogICAgc2hpZnQgPSAnRU5ER0FNRScKCnByaW50KGYndD17bWF0Y2hfdGltZX0sIHNoaWZ0ID0ge3NoaWZ0fScp" width="100%" height="320px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

## Exercises

### 2.1 Battery warnings

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:dm9sdGFnZSA9IDEyLjEKCiMgWU9VUiBDT0RFIEhFUkU6CiMgcHJpbnQgQ1JJVElDQUwgaWYgdm9sdGFnZSA8IDExCiMgcHJpbnQgTE9XIGlmIHZvbHRhZ2UgPCAxMgojIGVsc2UgcHJpbnQgR09PRA==" width="100%" height="260px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Solution</summary>

```python
if voltage < 11:
    print('CRITICAL')
elif voltage < 12:
    print('LOW')
else:
    print('GOOD')
```
</details>

### 2.2 The intake state machine

Fill in the state strings. Keep the branch order the same as `intake.py`.

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:aXNfaW50YWtpbmcgPSBGYWxzZQpjbGVhcl9qYW0gPSBUcnVlCmF0X2RlZmF1bHQgPSBGYWxzZQoKIyBLZWVwIHRoaXMgb3JkZXIgdGhlIHNhbWUgYXMgcGVyaW9kaWMoKSBpbiByb2JvdC9zdWJzeXN0ZW1zL2ludGFrZS5weS4KaWYgYXRfZGVmYXVsdDoKICAgIHN0YXRlID0gJycKZWxpZiBjbGVhcl9qYW06CiAgICBzdGF0ZSA9ICcnCmVsaWYgaXNfaW50YWtpbmc6CiAgICBzdGF0ZSA9ICcnCmVsc2U6CiAgICBzdGF0ZSA9ICcnCgpwcmludChmJ2ludGFrZSBpczoge3N0YXRlfScp" width="100%" height="420px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Solution</summary>

```python
if at_default:
    state = 'stowed'
elif clear_jam:
    state = 'reversing'
elif is_intaking:
    state = 'intaking'
else:
    state = 'stopped'
```

Order matters. Two flags can be true at the same time, and the first matching `if` decides. Change the flags at the top and run again to see each branch.
</details>

### 2.3 Who won auto?

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:YXV0b193aW4gPSBOb25lICAjIHdlIGRvIG5vdCBrbm93IHRoZSB3aW5uZXIgdW50aWwgdGhlIEZNUyBzZW5kcyBpdAoKIyBZT1VSIENPREUgSEVSRToKIyBwcmludCB1bmtub3duIGlmIGF1dG9fd2luIGlzIE5vbmUKIyBwcmludCBSRUQgaWYgYXV0b193aW4gaXMgVHJ1ZQojIHByaW50IEJMVUUgaWYgYXV0b193aW4gaXMgRmFsc2U=" width="100%" height="280px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Solution</summary>

```python
if auto_win is None:
    print('unknown')
elif auto_win:
    print('RED')
else:
    print('BLUE')
```

A bare `elif auto_win:` works because `auto_win` holds a bool. Set `auto_win = True` at the top and run again.
</details>

Next lesson: **3. Lists and Loops**.
