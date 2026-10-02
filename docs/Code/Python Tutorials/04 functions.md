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

{% include interactive/python-exercise.html id="py4_try" %}

## Exercises

### 4.1 Write clamp

{% include interactive/python-exercise.html id="py4_clamp" %}

### 4.2 Config with defaults

{% include interactive/python-exercise.html id="py4_motor_config" %}

### 4.3 Alliance flip

{% include interactive/python-exercise.html id="py4_flip_x" %}

Next lesson: **5. Classes and Objects**.
