---
title: 5. Classes and Objects
parent: Python Tutorials
nav_order: 5
---

# 5. Classes and Objects

Every subsystem in our robot follows this pattern. Learn this lesson well and you can read any file in `robot/subsystems/`.

## Summary

A **class** is a blueprint. It groups **attributes** (stored values) and **methods** (functions). An **object** is a thing made from the blueprint.

```python
class FakeMotor:
    def __init__(self, name):     # runs once when you make the object
        self.name = name          # attribute: stored on the object
        self.speed = 0.0

    def set(self, speed):         # method
        self.speed = speed

left = FakeMotor('left intake')   # make an object
left.set(0.8)                     # call a method
print(left.speed)                 # read an attribute
```

Rules and tools:

- `self` means: this object. It is the first parameter of every method. You never pass it yourself: `left.set(0.8)` fills it in automatically.
- Every attribute that other code must see starts with `self.`. A plain variable inside a method disappears when the method ends.
- Objects can hold other objects: `self.left = FakeMotor('left')`, then `self.left.set(...)`.
- A subsystem follows one pattern: `__init__` makes the hardware, other methods give commands, `periodic()` runs every frame.
- **Inheritance**: a class can start from another class and add to it. `super().__init__()` runs the setup of the parent class first:

```python
class Intake(Subsystem):          # Intake is a Subsystem, with more
    def __init__(self, robot):
        super().__init__()
        ...
```

- `isinstance(x, SomeClass)` tests what class an object came from.
- **Imports** bring in classes from other files. `import const` gives `const.LEFT_INTAKE_MOTOR_ID`. `from wpilib import Timer` gives `Timer` directly.

> You do not need to know the inside of the libraries. Make objects, set attributes, call methods. Example: `motor = hardware.TalonFX(id)`, then `motor.set_control(...)`. That is all the vendor documentation expects you to do.

## In our robot code

`robot/subsystems/intake.py`:

```python
class Intake(Subsystem):
    def __init__(self, robot: "Robot"):
        super().__init__()
        self.robot = robot
        self.left_intake_motor = hardware.TalonFX(const.LEFT_INTAKE_MOTOR_ID, "rio")
        self.commanded_intake_speed = 0.0

    def set_intake_speed(self, speed):
        self.commanded_intake_speed = speed / 100
        self.left_intake_motor.set_control(controls.DutyCycleOut(speed / 100))
```

## Try it

{% include interactive/python-exercise.html id="py5_try" %}

## Exercises

### 5.1 Add get() and status()

{% include interactive/python-exercise.html id="py5_motor_getter" %}

### 5.2 An intake with two motors

{% include interactive/python-exercise.html id="py5_two_motor_intake" %}

### 5.3 Inherit from Subsystem

{% include interactive/python-exercise.html id="py5_hopper_subsystem" %}

Next lesson: **6. RobotPy Patterns**.
