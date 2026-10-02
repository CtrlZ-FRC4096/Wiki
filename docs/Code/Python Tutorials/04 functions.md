---
title: 4. Functions
parent: Python Tutorials
nav_order: 4
---

# 4. Functions

Write a calculation once. Use it many times.

## Summary

```python
def clamp(x, low, high):            # parameters in the parentheses
    return max(low, min(high, x))   # return sends a value back

speed = clamp(1.4, -1, 1)           # call the function
print(speed)                        # 1
```

- The code inside the function runs only when you call it.
- `return` sends a value back and ends the function. Without `return`, the caller gets `None`.
- Default arguments let callers skip parameters:

```python
def get_motor_config(k_p=0.0, current_limit=40):
    return (k_p, current_limit)

get_motor_config()              # uses both defaults
get_motor_config(k_p=8)         # changes one, by name
```

- Name the arguments (`k_p=8`) instead of only using position. Names make tuning code easy to read.

## In our robot code

`robot/robot.py` has one function that configures every TalonFX motor:

```python
def get_motor_config(self, inverted=0, k_p=0.0, k_i=0.0, k_d=0.0, ...):
    motor_config = configs.TalonFXConfiguration()
    ...
    return motor_config
```

A subsystem calls it with only the values it changes:

```python
self.intake_motor_config = self.robot.get_motor_config(0, 8, 0, 0, 0.0161, 0, 0, 2.5)
```

A small helper keeps alliance-flip math in one place:

```python
def flip_X_coord(self, x):
    return self.fieldConstants.fieldLength - x
```

## Try it

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:ZGVmIHJvdGF0ZV9kaXN0YW5jZShyb3RhdGlvbnMsIGdlYXJfcmF0aW8sIHdoZWVsX2NpcmMpOgogICAgd2hlZWxfdHVybnMgPSByb3RhdGlvbnMvIC8gZ2Vhcl9yYXRpbwogICAgcmV0dXJuIHdoZWVsX3R1cm5zICogd2hlZWxfY2lyYwoKZCA9IHJvdGF0ZV9kaXN0YW5jZSg1Ni44LCBnZWFyX3JhdGlvPTUuNjgsIHdoZWVsX2NpcmM9MC4zMTkpCnByaW50KGYncm9ib3QgZHJvdmUge2Q6LjFmfSBtZXRlcnMnKQ==" width="100%" height="320px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

## Exercises

### 4.1 Write clamp

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:ZGVmIGNsYW1wKHgsIGxvdywgaGlnaCk6CiAgICAjIFlPVVIgQ09ERSBIRVJFOiByZXR1cm4geCwgYnV0IGhvbGQgaXQgaW4gW2xvdywgaGlnaF0KICAgIHBhc3MKCnByaW50KGNsYW1wKDEuNCwgLTEsIDEpKSAgICMgbXVzdCBwcmludCAxCnByaW50KGNsYW1wKC0yLjUsIC0xLCAxKSkgICMgbXVzdCBwcmludCAtMQpwcmludChjbGFtcCgwLjMsIC0xLCAxKSkgICAjIG11c3QgcHJpbnQgMC4z" width="100%" height="300px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Solution</summary>

```python
def clamp(x, low, high):
    return max(low, min(high, x))
```
</details>

### 4.2 Default arguments

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:ZGVmIGdldF9tb3Rvcl9jb25maWcoa19wPTAuMCwgY3VycmVudF9saW1pdD00MCk6CiAgICAjIFlPVVIgQ09ERSBIRVJFOiByZXR1cm4gdGhlIHR1cGxlIChrX3AsIGN1cnJlbnRfbGltaXQpCiAgICBwYXNzCgpjZmcgPSBnZXRfbW90b3JfY29uZmlnKGtfcD04KQpwcmludChjZmcpICAjIG11c3QgcHJpbnQgKDgsIDQwKQpwcmludChnZXRfbW90b3JfY29uZmlnKCkpICAjIG11c3QgcHJpbnQgKDAuMCwgNDAp" width="100%" height="320px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Solution</summary>

```python
def get_motor_config(k_p=0.0, current_limit=40):
    return (k_p, current_limit)
```

`(k_p, current_limit)` is a tuple: a fixed group of values. You can index it or unpack it. Lookup tables use tuples.
</details>

### 4.3 Alliance flip

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:ZmllbGRfbGVuZ3RoID0gMTYuNTQgICMgbWV0ZXJzCgpkZWYgZmxpcF94KHgpOgogICAgIyBZT1VSIENPREUgSEVSRTogcmV0dXJuIHRoZSByZWQtYWxsaWFuY2UgbWlycm9yIG9mIHgKICAgICMgKGxpa2UgZmxpcF9YX2Nvb3JkIGluIHJvYm90LnB5KQogICAgcGFzcwoKcHJpbnQoZmxpcF94KDIuMCkpICAjIG11c3QgcHJpbnQgMTQuNTQ=" width="100%" height="320px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Solution</summary>

```python
def flip_x(x):
    return field_length - x
```
</details>

Next lesson: **5. Classes and Objects**.
