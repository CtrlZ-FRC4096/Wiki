---
title: 4. Functions
parent: Python Tutorials
nav_order: 4
---

# 4. Functions

Write a calculation once, give it a name, and use it many times.

## Summary

```python
def clamp(x, low, high):            # parameters in the parentheses
    return max(low, min(high, x))   # return sends a value back

speed = clamp(1.4, -1, 1)           # call with arguments
print(speed)                        # 1
```

Rules and tools:

- The code inside a function runs only when someone calls it. Defining it changes nothing.
- **Parameters** are the names in the definition (`x, low, high`). **Arguments** are the values in the call (`1.4, -1, 1`). Arguments fill parameters in order.
- You can also name the arguments: `clamp(1.4, low=-1, high=1)`. Naming them makes tuning code easy to read. Our motor config calls do this.
- `return` sends a value back **and ends the function**. Code under `return` never runs. Without `return`, the caller gets `None`. Forgetting `return` and then printing `None` is a classic bug.
- Variables you make inside a function are local: they do not exist outside it.
- **Default arguments** let callers skip parameters:

```python
def get_motor_config(k_p=0.0, current_limit=40):
    return (k_p, current_limit)

get_motor_config()              # (0.0, 40): both defaults
get_motor_config(k_p=8)         # (8, 40): changes one
```

- A function of the form `def set_position(self, position): '''position is in degrees'''` has a **docstring**: a string as the first line that documents the function. `intake.py` uses these.

## In our robot code

`robot/robot.py` has one function that configures every TalonFX motor. Eight parameters, nearly all defaults:

```python
def get_motor_config(self, inverted=0, k_p=0.0, k_i=0.0, k_d=0.0, ...):
    motor_config = configs.TalonFXConfiguration()
    ...
    return motor_config
```

A subsystem only passes what it changes:

```python
self.intake_motor_config = self.robot.get_motor_config(0, 8, 0, 0, 0.0161, 0, 0, 2.5)
```

A small helper keeps alliance-flip math in one place:

```python
def flip_X_coord(self, x):
    return self.fieldConstants.fieldLength - x
```

## Try it

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:ZGVmIHJvdGF0ZV9kaXN0YW5jZShyb3RhdGlvbnMsIGdlYXJfcmF0aW8sIHdoZWVsX2NpcmMpOgogICAgd2hlZWxfdHVybnMgPSByb3RhdGlvbnMgLyBnZWFyX3JhdGlvCiAgICByZXR1cm4gd2hlZWxfdHVybnMgKiB3aGVlbF9jaXJjCgpkID0gcm90YXRlX2Rpc3RhbmNlKDU2LjgsIGdlYXJfcmF0aW89NS42OCwgd2hlZWxfY2lyYz0wLjMxOSkKcHJpbnQoZidyb2JvdCBkcm92ZSB7ZDouMWZ9IG1ldGVycycp" width="100%" height="320px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

## Exercises

Every exercise ends with tests. Run the code until every line prints **PASS**.

### 4.1 Write clamp

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:ZGVmIGNsYW1wKHgsIGxvdywgaGlnaCk6CiAgICAjIHJldHVybiB4LCBidXQgaG9sZCBpdCBpbiBbbG93LCBoaWdoXQogICAgcGFzcwoKCiMgLS0tLS0gVEVTVFMgKGRvIG5vdCBjaGFuZ2UpIC0tLS0tCmRlZiBjaGVjayhuYW1lLCBmbik6CiAgICB0cnk6CiAgICAgICAgb2sgPSBib29sKGZuKCkpCiAgICBleGNlcHQgRXhjZXB0aW9uOgogICAgICAgIG9rID0gRmFsc2UKICAgIHByaW50KCgnUEFTUycgaWYgb2sgZWxzZSAnRkFJTCcpICsgJyAtICcgKyBuYW1lKQogICAgcmV0dXJuIG9rCgpzY29yZSA9IHN1bShbCiAgICBjaGVjaygnY2xhbXAoMS40LCAtMSwgMSkgaXMgMScsIGxhbWJkYTogYWJzKGNsYW1wKDEuNCwgLTEsIDEpIC0gMSkgPCAwLjAwMDEpLAogICAgY2hlY2soJ2NsYW1wKC0yLjUsIC0xLCAxKSBpcyAtMScsIGxhbWJkYTogYWJzKGNsYW1wKC0yLjUsIC0xLCAxKSAtICgtMSkpIDwgMC4wMDAxKSwKICAgIGNoZWNrKCdjbGFtcCgwLjMsIC0xLCAxKSBpcyAwLjMnLCBsYW1iZGE6IGFicyhjbGFtcCgwLjMsIC0xLCAxKSAtIDAuMykgPCAwLjAwMDEpLAogICAgY2hlY2soJ2NsYW1wKDUsIDAsIDEwKSBpcyA1JywgbGFtYmRhOiBhYnMoY2xhbXAoNSwgMCwgMTApIC0gNSkgPCAwLjAwMDEpLAogICAgY2hlY2soJ2NsYW1wKC0xLCAtMSwgMSkgaXMgLTEnLCBsYW1iZGE6IGFicyhjbGFtcCgtMSwgLTEsIDEpIC0gKC0xKSkgPCAwLjAwMDEpCl0pCnByaW50KGYnU0NPUkU6IHtzY29yZX0vNScp" width="100%" height="400px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Hint</summary>

One line with `min` and `max` is enough. Which of the two should wrap the other?
</details>

<details markdown="block">
<summary>Solution</summary>

```python
def clamp(x, low, high):
    return max(low, min(high, x))
```

The tests include a boundary case: when x is exactly the limit, clamp returns the limit.
</details>

### 4.2 Default arguments

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:ZGVmIGdldF9tb3Rvcl9jb25maWcoa19wPTAuMCwgY3VycmVudF9saW1pdD00MCk6CiAgICAjIHJldHVybiB0aGUgdHVwbGUgKGtfcCwgY3VycmVudF9saW1pdCkKICAgIHBhc3MKCgojIC0tLS0tIFRFU1RTIChkbyBub3QgY2hhbmdlKSAtLS0tLQpkZWYgY2hlY2sobmFtZSwgZm4pOgogICAgdHJ5OgogICAgICAgIG9rID0gYm9vbChmbigpKQogICAgZXhjZXB0IEV4Y2VwdGlvbjoKICAgICAgICBvayA9IEZhbHNlCiAgICBwcmludCgoJ1BBU1MnIGlmIG9rIGVsc2UgJ0ZBSUwnKSArICcgLSAnICsgbmFtZSkKICAgIHJldHVybiBvawoKc2NvcmUgPSBzdW0oWwogICAgY2hlY2soJ2RlZmF1bHRzIGdpdmUgKDAuMCwgNDApJywgbGFtYmRhOiBnZXRfbW90b3JfY29uZmlnKCkgPT0gKDAuMCwgNDApKSwKICAgIGNoZWNrKCdrX3AgYnkgbmFtZScsIGxhbWJkYTogZ2V0X21vdG9yX2NvbmZpZyhrX3A9OCkgPT0gKDgsIDQwKSksCiAgICBjaGVjaygnY3VycmVudF9saW1pdCBieSBuYW1lJywgbGFtYmRhOiBnZXRfbW90b3JfY29uZmlnKGN1cnJlbnRfbGltaXQ9MzApID09ICgwLjAsIDMwKSkKXSkKcHJpbnQoZidTQ09SRToge3Njb3JlfS8zJyk=" width="100%" height="400px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Hint</summary>

The tuple is the two parameters in parentheses. Nothing else is needed.
</details>

<details markdown="block">
<summary>Solution</summary>

```python
def get_motor_config(k_p=0.0, current_limit=40):
    return (k_p, current_limit)
```

A tuple is a fixed group of values. You can index it (`cfg[0]`) or unpack it (`k_p, limit = cfg`).
</details>

### 4.3 Alliance flip

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:ZmllbGRfbGVuZ3RoID0gMTYuNTQgICMgbWV0ZXJzCgpkZWYgZmxpcF94KHgpOgogICAgIyByZXR1cm4gdGhlIHJlZC1hbGxpYW5jZSBtaXJyb3Igb2YgeCAobGlrZSBmbGlwX1hfY29vcmQgaW4gcm9ib3QucHkpCiAgICBwYXNzCgoKIyAtLS0tLSBURVNUUyAoZG8gbm90IGNoYW5nZSkgLS0tLS0KZGVmIGNoZWNrKG5hbWUsIGZuKToKICAgIHRyeToKICAgICAgICBvayA9IGJvb2woZm4oKSkKICAgIGV4Y2VwdCBFeGNlcHRpb246CiAgICAgICAgb2sgPSBGYWxzZQogICAgcHJpbnQoKCdQQVNTJyBpZiBvayBlbHNlICdGQUlMJykgKyAnIC0gJyArIG5hbWUpCiAgICByZXR1cm4gb2sKCnNjb3JlID0gc3VtKFsKICAgIGNoZWNrKCdmbGlwX3goMi4wKSBpcyAxNC41NCcsIGxhbWJkYTogYWJzKGZsaXBfeCgyLjApIC0gMTQuNTQpIDwgMC4wMDEpLAogICAgY2hlY2soJ2ZsaXBfeCgxNC41NCkgaXMgMi4wJywgbGFtYmRhOiBhYnMoZmxpcF94KDE0LjU0KSAtIDIuMCkgPCAwLjAwMSksCiAgICBjaGVjaygnZmxpcCB0d2ljZSByZXR1cm5zIHRoZSBzdGFydCcsIGxhbWJkYTogYWJzKGZsaXBfeChmbGlwX3goMy4wKSkgLSAzLjApIDwgMC4wMDEpCl0pCnByaW50KGYnU0NPUkU6IHtzY29yZX0vMycp" width="100%" height="420px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Hint</summary>

Mirroring across the field: `x` plus its mirror always adds up to the field length.
</details>

<details markdown="block">
<summary>Solution</summary>

```python
def flip_x(x):
    return field_length - x
```

The last test flips twice and demands the original value back. A mirror that fails this test would slowly drift poses across the field.
</details>

Next lesson: **5. Classes and Objects**.
