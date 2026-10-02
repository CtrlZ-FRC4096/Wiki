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

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:bWF0Y2hfdGltZSA9IDc1CgppZiBtYXRjaF90aW1lIDw9IDEwOgogICAgc2hpZnQgPSAnVFJBTlNJVElPTicKZWxpZiBtYXRjaF90aW1lIDw9IDExMDoKICAgIHNoaWZ0ID0gJ1NISUZUJwplbHNlOgogICAgc2hpZnQgPSAnRU5ER0FNRScKCnByaW50KGYndD17bWF0Y2hfdGltZX0sIHNoaWZ0ID0ge3NoaWZ0fScp" width="100%" height="340px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

## Exercises

Every exercise ends with tests. Run the code until every line prints **PASS**.

### 2.1 Battery warnings and shift windows

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:dm9sdGFnZSA9IDExLjgKbWF0Y2hfdGltZSA9IDc1CgojIFBBUlQgQTogc2V0IGxldmVsIHRvICdDUklUSUNBTCcgaWYgdm9sdGFnZSA8IDExLAojICdMT1cnIGlmIHZvbHRhZ2UgPCAxMiwgZWxzZSAnR09PRCcuIFVzZSBpZiAvIGVsaWYgLyBlbHNlLgpsZXZlbCA9ICcnICAjIEZJWCBUSElTCgojIFBBUlQgQjogc2V0IHNoaWZ0IHRvICdUUkFOU0lUSU9OJyBpZiBtYXRjaF90aW1lIDw9IDEwLAojICdTSElGVCcgaWYgbWF0Y2hfdGltZSA8PSAxMTAsIGVsc2UgJ0VOREdBTUUnLgpzaGlmdCA9ICcnICAjIEZJWCBUSElTCgoKIyAtLS0tLSBURVNUUyAoZG8gbm90IGNoYW5nZSkgLS0tLS0KZGVmIGNoZWNrKG5hbWUsIGZuKToKICAgIHRyeToKICAgICAgICBvayA9IGJvb2woZm4oKSkKICAgIGV4Y2VwdCBFeGNlcHRpb246CiAgICAgICAgb2sgPSBGYWxzZQogICAgcHJpbnQoKCdQQVNTJyBpZiBvayBlbHNlICdGQUlMJykgKyAnIC0gJyArIG5hbWUpCiAgICByZXR1cm4gb2sKCnNjb3JlID0gc3VtKFsKICAgIGNoZWNrKCcxMS44IFYgaXMgTE9XJywgbGFtYmRhOiBsZXZlbCA9PSAnTE9XJyksCiAgICBjaGVjaygnNzUgcyBpcyBTSElGVCcsIGxhbWJkYTogc2hpZnQgPT0gJ1NISUZUJykKXSkKcHJpbnQoZidTQ09SRToge3Njb3JlfS8yJyk=" width="100%" height="500px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Hint</summary>

Each part is one `if / elif / else` chain. Check the smaller thresholds first.
</details>

<details markdown="block">
<summary>Solution</summary>

```python
if voltage < 11:
    level = 'CRITICAL'
elif voltage < 12:
    level = 'LOW'
else:
    level = 'GOOD'

if match_time <= 10:
    shift = 'TRANSITION'
elif match_time <= 110:
    shift = 'SHIFT'
else:
    shift = 'ENDGAME'
```
</details>

### 2.2 The intake state machine

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:IyBGaWxsIGluIHRoZSBzdGF0ZSBzdHJpbmdzLgojIEtlZXAgdGhpcyBvcmRlciB0aGUgc2FtZSBhcyBwZXJpb2RpYygpIGluIHJvYm90L3N1YnN5c3RlbXMvaW50YWtlLnB5LgoKIyBTQ0VOQVJJTyBBCmF0X2RlZmF1bHQgPSBGYWxzZQpjbGVhcl9qYW0gPSBUcnVlCmlzX2ludGFraW5nID0gRmFsc2UKCmlmIGF0X2RlZmF1bHQ6CiAgICBzdGF0ZV9hID0gJycgICMgRklYIFRISVMKZWxpZiBjbGVhcl9qYW06CiAgICBzdGF0ZV9hID0gJycgICMgRklYIFRISVMKZWxpZiBpc19pbnRha2luZzoKICAgIHN0YXRlX2EgPSAnJyAgIyBGSVggVEhJUwplbHNlOgogICAgc3RhdGVfYSA9ICcnICAjIEZJWCBUSElTCgojIFNDRU5BUklPIEI6IGFsbCBmbGFncyBhcmUgVHJ1ZS4gV2hpY2ggYnJhbmNoIHdpbnM/CmF0X2RlZmF1bHQgPSBUcnVlCmNsZWFyX2phbSA9IFRydWUKaXNfaW50YWtpbmcgPSBUcnVlCnN0YXRlX2IgPSAnJyAgIyBGSVggVEhJUzogd3JpdGUgdGhlIHNhbWUgaWYvZWxpZiBjaGFpbiBoZXJlCgoKIyAtLS0tLSBURVNUUyAoZG8gbm90IGNoYW5nZSkgLS0tLS0KZGVmIGNoZWNrKG5hbWUsIGZuKToKICAgIHRyeToKICAgICAgICBvayA9IGJvb2woZm4oKSkKICAgIGV4Y2VwdCBFeGNlcHRpb246CiAgICAgICAgb2sgPSBGYWxzZQogICAgcHJpbnQoKCdQQVNTJyBpZiBvayBlbHNlICdGQUlMJykgKyAnIC0gJyArIG5hbWUpCiAgICByZXR1cm4gb2sKCnNjb3JlID0gc3VtKFsKICAgIGNoZWNrKCdqYW0gbWVhbnMgcmV2ZXJzaW5nJywgbGFtYmRhOiBzdGF0ZV9hID09ICdyZXZlcnNpbmcnKSwKICAgIGNoZWNrKCdkZWZhdWx0IHdpbnMgd2hlbiBhbGwgZmxhZ3MgYXJlIFRydWUnLCBsYW1iZGE6IHN0YXRlX2IgPT0gJ3N0b3dlZCcpCl0pCnByaW50KGYnU0NPUkU6IHtzY29yZX0vMicp" width="100%" height="620px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Hint</summary>

The four states are `stowed`, `reversing`, `intaking`, and `stopped`. For scenario B, repeat the same chain. Ask yourself which `if` the code reaches first.
</details>

<details markdown="block">
<summary>Solution</summary>

```python
# scenario A
if at_default:
    state_a = 'stowed'
elif clear_jam:
    state_a = 'reversing'
elif is_intaking:
    state_a = 'intaking'
else:
    state_a = 'stopped'

# scenario B: identical chain
if at_default:
    state_b = 'stowed'
elif clear_jam:
    state_b = 'reversing'
elif is_intaking:
    state_b = 'intaking'
else:
    state_b = 'stopped'
```

Scenario B shows why order matters: all flags are True, and the first `if` wins. When you change branch order in real code, you change what the robot does when two things are true at once.
</details>

### 2.3 Who won auto?

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:IyBhdXRvX3dpbjogTm9uZSBtZWFucyB1bmtub3duLCBUcnVlIG1lYW5zIFJFRCwgRmFsc2UgbWVhbnMgQkxVRS4KIyBTZXQgdGhlIGxhYmVsIHdpdGggaWYgLyBlbGlmIC8gZWxzZS4KCmF1dG9fd2luX2EgPSBOb25lCmxhYmVsX2EgPSAnJyAgIyBGSVggVEhJUwoKYXV0b193aW5fYiA9IFRydWUKbGFiZWxfYiA9ICcnICAjIEZJWCBUSElTCgoKIyAtLS0tLSBURVNUUyAoZG8gbm90IGNoYW5nZSkgLS0tLS0KZGVmIGNoZWNrKG5hbWUsIGZuKToKICAgIHRyeToKICAgICAgICBvayA9IGJvb2woZm4oKSkKICAgIGV4Y2VwdCBFeGNlcHRpb246CiAgICAgICAgb2sgPSBGYWxzZQogICAgcHJpbnQoKCdQQVNTJyBpZiBvayBlbHNlICdGQUlMJykgKyAnIC0gJyArIG5hbWUpCiAgICByZXR1cm4gb2sKCnNjb3JlID0gc3VtKFsKICAgIGNoZWNrKCdOb25lIGJlY29tZXMgdW5rbm93bicsIGxhbWJkYTogbGFiZWxfYSA9PSAndW5rbm93bicpLAogICAgY2hlY2soJ1RydWUgYmVjb21lcyBSRUQnLCBsYW1iZGE6IGxhYmVsX2IgPT0gJ1JFRCcpCl0pCnByaW50KGYnU0NPUkU6IHtzY29yZX0vMicp" width="100%" height="440px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Hint</summary>

Test for `None` first. Then `elif auto_win:` uses the bool itself as the condition.
</details>

<details markdown="block">
<summary>Solution</summary>

```python
if auto_win_a is None:
    label_a = 'unknown'
elif auto_win_a:
    label_a = 'RED'
else:
    label_a = 'BLUE'

if auto_win_b is None:
    label_b = 'unknown'
elif auto_win_b:
    label_b = 'RED'
else:
    label_b = 'BLUE'
```
</details>

Next lesson: **3. Lists and Loops**.
