---
title: 5. Classes and Objects
parent: Python Tutorials
nav_order: 5
---

# 5. Classes and Objects

Every subsystem in our robot follows this pattern.

## Summary

A class is a blueprint. It groups **attributes** (stored values) and **methods** (functions). An object is a thing made from the blueprint.

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

- `self` means: this object. It is the first parameter of each method. You never pass it yourself. `left.set(0.8)` fills it in automatically.
- Subsystem pattern: `__init__` makes the hardware. The other methods give commands.
- Inheritance: a class can start from another class and add to it. `super().__init__()` runs the setup of the parent class first:

```python
class Intake(Subsystem):          # Intake is a Subsystem, with more
    def __init__(self, robot):
        super().__init__()
        ...
```

- Imports bring in classes from other files. `import const` gives `const.LEFT_INTAKE_MOTOR_ID`. `from wpilib import Timer` gives `Timer` directly.

> You do not need to know the inside of the libraries. Make objects, set attributes, call methods. Example: `motor = hardware.TalonFX(id)`, then `motor.set_control(...)`.

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

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:Y2xhc3MgRmFrZU1vdG9yOgogICAgZGVmIF9faW5pdF9fKHNlbGYsIG5hbWUpOgogICAgICAgIHNlbGYubmFtZSA9IG5hbWUKICAgICAgICBzZWxmLnNwZWVkID0gMC4wCgogICAgZGVmIHNldChzZWxmLCBzcGVlZCk6ICAgICAgICAjIGxpa2UgbW90b3Iuc2V0X2NvbnRyb2woLi4uKQogICAgICAgIHNlbGYuc3BlZWQgPSBzcGVlZAoKbSA9IEZha2VNb3RvcignbGVmdCBpbnRha2UnKQptLnNldCgwLjgpCnByaW50KGYne20ubmFtZX0gcnVucyBhdCB7bS5zcGVlZH0nKQ==" width="100%" height="400px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

## Exercises

### 5.1 Add a getter

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:Y2xhc3MgRmFrZU1vdG9yOgogICAgZGVmIF9faW5pdF9fKHNlbGYsIG5hbWUpOgogICAgICAgIHNlbGYubmFtZSA9IG5hbWUKICAgICAgICBzZWxmLnNwZWVkID0gMC4wCgogICAgZGVmIHNldChzZWxmLCBzcGVlZCk6CiAgICAgICAgc2VsZi5zcGVlZCA9IHNwZWVkCgogICAgZGVmIGdldChzZWxmKToKICAgICAgICAjIFlPVVIgQ09ERSBIRVJFOiByZXR1cm4gc2VsZi5zcGVlZAogICAgICAgIHBhc3MKCm0gPSBGYWtlTW90b3IoJ2RlcGxveScpCm0uc2V0KC0wLjM1KQpwcmludChtLmdldCgpKSAgIyBtdXN0IHByaW50IC0wLjM1" width="100%" height="460px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Solution</summary>

```python
def get(self):
    return self.speed
```
</details>

### 5.2 An intake with two motors

The real robot uses a Follower for the second motor. Here, set both yourself:

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:Y2xhc3MgRmFrZU1vdG9yOgogICAgZGVmIF9faW5pdF9fKHNlbGYsIG5hbWUpOgogICAgICAgIHNlbGYubmFtZSA9IG5hbWUKICAgICAgICBzZWxmLnNwZWVkID0gMC4wCgogICAgZGVmIHNldChzZWxmLCBzcGVlZCk6CiAgICAgICAgc2VsZi5zcGVlZCA9IHNwZWVkCgpjbGFzcyBGYWtlSW50YWtlOgogICAgZGVmIF9faW5pdF9fKHNlbGYpOgogICAgICAgIHNlbGYubGVmdCA9IEZha2VNb3RvcignbGVmdCcpCiAgICAgICAgc2VsZi5yaWdodCA9IEZha2VNb3RvcigncmlnaHQnKQoKICAgIGRlZiBzZXRfc3BlZWQoc2VsZiwgc3BlZWQpOgogICAgICAgICMgWU9VUiBDT0RFIEhFUkU6IHNldCBib3RoIG1vdG9ycy4gT24gdGhlIHJlYWwgcm9ib3Qgd2UgdXNlIGEgRm9sbG93ZXIuCiAgICAgICAgcGFzcwoKaSA9IEZha2VJbnRha2UoKQppLnNldF9zcGVlZCgwLjg1KQpwcmludChpLmxlZnQuc3BlZWQsIGkucmlnaHQuc3BlZWQpICAjIG11c3QgcHJpbnQgMC44NSAwLjg1" width="100%" height="540px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Solution</summary>

```python
def set_speed(self, speed):
    self.left.set(speed)
    self.right.set(speed)
```

Objects can hold other objects. `self.left` is a FakeMotor. `self.left.set(...)` calls its method.
</details>

### 5.3 Inherit from Subsystem

This is the same class header as every subsystem file:

<iframe src="{{ '/assets/python-runner.html' | relative_url }}#b64:Y2xhc3MgU3Vic3lzdGVtOgogICAgZGVmIF9faW5pdF9fKHNlbGYsIG5hbWUpOgogICAgICAgIHNlbGYubmFtZSA9IG5hbWUKCmNsYXNzIEhvcHBlcihTdWJzeXN0ZW0pOgogICAgZGVmIF9faW5pdF9fKHNlbGYpOgogICAgICAgIHN1cGVyKCkuX19pbml0X18oJ2hvcHBlcicpICAjIHJ1biB0aGUgc2V0dXAgb2YgdGhlIHBhcmVudCBjbGFzcwogICAgICAgIHNlbGYucnVubmluZyA9IEZhbHNlCgogICAgZGVmIHN0YXJ0KHNlbGYpOgogICAgICAgIHNlbGYucnVubmluZyA9IFRydWUKCiAgICAjIFlPVVIgQ09ERSBIRVJFOiBhZGQgc3RvcCgpLiBTZXQgc2VsZi5ydW5uaW5nID0gRmFsc2UuCgoKaCA9IEhvcHBlcigpCmguc3RhcnQoKQpwcmludChmJ3toLm5hbWV9IHJ1bm5pbmcgPSB7aC5ydW5uaW5nfScpICAjIG11c3QgcHJpbnQgVHJ1ZQpoLnN0b3AoKQpwcmludChmJ3toLm5hbWV9IHJ1bm5pbmcgPSB7aC5ydW5uaW5nfScpICAjIG11c3QgcHJpbnQgRmFsc2U=" width="100%" height="540px" style="border:1px solid #d1d5db;border-radius:8px;"></iframe>

<details markdown="block">
<summary>Solution</summary>

```python
def stop(self):
    self.running = False
```

Why inherit? `Subsystem` gives `periodic()`, command scheduling, and dashboard integration. `super().__init__(...)` runs the setup of the parent so this works.
</details>

Next lesson: **6. RobotPy Patterns**.
